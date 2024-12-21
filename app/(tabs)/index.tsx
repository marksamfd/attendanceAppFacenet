import {StyleSheet, Text, View} from 'react-native';
import {
    Camera,
    useCameraDevice,
    useCameraFormat,
    useFrameProcessor,
    getCameraFormat, runAtTargetFps, useSkiaFrameProcessor
} from "react-native-vision-camera";
import {useContext, useEffect, useMemo, useRef, useState} from "react";
import {useFaceDetector} from 'react-native-vision-camera-face-detector'

import {useSharedValue, Worklets} from "react-native-worklets-core";
import {recognizeFace} from "@/components/onnexFrameProcessor";
import DbContext from "@/app/dbContext";
import {useIsFocused, useRoute} from "@react-navigation/core";
import {useTensorflowModel} from "react-native-fast-tflite";
import {useResizePlugin} from "vision-camera-resize-plugin";
import {TensorflowModel} from "react-native-fast-tflite/src";
import {
    Skia,
    createPicture,
    Canvas,
    Picture,
    AlphaType,
    ColorType
} from '@shopify/react-native-skia'
const WIDTH = 112
const HEIGHT = 112
export default function HomeScreen() {
    const faceRecognition = useTensorflowModel(require('../../assets/models/mobile_face_net.tflite'))
    const model = useSharedValue<TensorflowModel>()
    const device = useCameraDevice('front')
    const {resize} = useResizePlugin()
    const {detectFaces} = useFaceDetector({trackingEnabled: true})
    const format = useCameraFormat(device, [
        {videoResolution: "max"},

    ])
    const db = useContext(DbContext)
    const isFocused = useIsFocused()
    const cameraViewRef = useRef<Camera>()


    const [frameTimestamp, setFrameTimestamp] = useState(0)
    const updateDataFromWorklet = Worklets.createRunOnJS(setFrameTimestamp)
    const resizedFrameData = useSharedValue(new Array(WIDTH * HEIGHT * 4).fill(0))
    const picture = useMemo(
        () =>
            createPicture((canvas) => {
                if (resizedFrameData.value) {
                    const imageArray = new Uint8Array(resizedFrameData.value)
                    const skiaImageInfo = { width: WIDTH, height: HEIGHT, alphaType: AlphaType.Opaque, colorType: ColorType.RGBA_8888 }

                    const skiaImageData = Skia.Data.fromBytes(imageArray)
                    const image = Skia.Image.MakeImage(skiaImageInfo, skiaImageData, WIDTH * 4)

                    canvas.drawImage(image, 0, 0)
                }
            }),
        [frameTimestamp]
    )


    useEffect(() => {
        if (device) {
            const foundFormat = getCameraFormat(device, [

                // {fps: 30}
            ])
            console.log("Video: ", foundFormat.videoWidth, "x", foundFormat.videoHeight)
            console.log("Photo: ", foundFormat.photoWidth, "x", foundFormat.photoHeight)
            console.log("Current Format: ", format?.videoWidth, "x", format?.videoHeight)
        }
    }, []);

    useEffect(() => {
        console.log("MOdel change", faceRecognition.state)
        console.log(faceRecognition)
        faceRecognition.state === "loaded" ? model.value = (faceRecognition.model) : undefined
    }, [faceRecognition.state]);


    const onFaceDetected = Worklets.createRunOnJS((faceVector) => {
        // console.log(faceVector)
        // return
        db.execute(`
        SELECT
        r.id,r.name,AVG((1-vec_distance_cosine(fe.face_embedding,vec_f32(?)))) as similarity,
        (vec_distance_L2(fe.face_embedding,vec_f32(?))) as distance_l2
        FROM registered_people as r inner join face_embedding as fe on r.id = fe.id group by r.name
        ORDER BY similarity DESC;`, [faceVector, faceVector]).then(rows => {
            console.log(rows)
            rows.rows.map(r => {
                console.log(`${r.name} has a cosine similarity to current face ${Math.floor(r.similarity)},${r.similarity*100}`)
            })
            // return db.execute("insert into attendance (userId) values (?)", [rows[0][0]])

        }).catch(console.error)

    })


    const frameProcessorOnnex = useFrameProcessor(async (frame) => {
        'worklet'
        // frameNums.value += 1

        runAtTargetFps(1, () => {
            const scannedFaces = detectFaces(frame);
            if (scannedFaces.length > 0) {
                console.log(scannedFaces[0].bounds)
                let currentVector = recognizeFace(frame, scannedFaces[0])
                let vectorToComp = `${currentVector}`
                console.log(vectorToComp)
                onFaceDetected(vectorToComp)
            }
        })

    }, [])

    const frameProcessorTfliteSkia = useSkiaFrameProcessor((frame) => {
        "worklet"
        frame.render()
        runAtTargetFps(1, () => {
            "worklet"
            const scannedFaces = detectFaces(frame);
            scannedFaces.forEach(scannedFaces=>{
                const resized = resize(frame, {
                    crop: {
                        x:scannedFaces.bounds.x +240,
                        y:scannedFaces.bounds.y-450,
                        width:scannedFaces.bounds.width,
                        height:scannedFaces.bounds.height,
                    },
                    rotation:"270deg",
                    scale: {
                        width: 112,
                        height: 112,
                    },
                    pixelFormat: 'rgb',
                    dataType: 'float32',
                })


                // const arrayData = new Array(WIDTH * HEIGHT * 4)
                // for (let i = 0, j = 0; i < resized.length; i += 3,  j += 4) {
                //     arrayData[j] = resized[i]       // R
                //     arrayData[j+1] = resized[i + 1] // G
                //     arrayData[j+2] = resized[i + 2]  // B
                //     arrayData[j+3] = 255          // A
                // }
                const arrayData = new Array(WIDTH * HEIGHT * 4)
                for (let i = 0, j = 0; i < resized.length; i += 3,  j += 4) {
                    arrayData[j] = resized[i] * 255       // R
                    arrayData[j+1] = resized[i + 1] * 255 // G
                    arrayData[j+2] = resized[i + 2] * 255 // B
                    arrayData[j+3] = 255          // A
                }

                resizedFrameData.value = arrayData
                // Update state value without passing the complete array
                updateDataFromWorklet(new Date().valueOf())


                let currentVector = model?.value?.runSync([resized])
                // console.log(Object.values(currentVector[0]))
                //
                let vectorToComp = `[${Object.values(currentVector[0]).toString()}]`
                onFaceDetected(vectorToComp)

            })
        })
    }, [])
    // @ts-ignore
    return (

        <View style={{height: "100%", flex: 1, paddingTop: 50}}>
            {faceRecognition.state == "loaded" ?
                <Camera
                    ref={cameraViewRef}
                    device={device}
                    format={format}
                    frameProcessor={frameProcessorTfliteSkia}
                    outputOrientation={"device"}
                    style={[StyleSheet.absoluteFill]}
                    isActive={isFocused}
                    // isActive={photo === undefined}
                    resizeMode={"contain"}
                    photo={true}
                />
                :
                <Text style={{color:"black", fontSize:20}}>Model is loading</Text>
            }

            <View style={{
                width: "100%",
                flexDirection: "row",
                zIndex: 999,
                alignItems: "center",
                justifyContent: "center"
            }}>
                <Canvas style={{ width: 320, height: 320 }}>
                    <Picture picture={picture} />
                </Canvas>
            </View>
        </View>

    );
}

