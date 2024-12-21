import {Text, TextInput, StyleSheet, Pressable, Image, View, Button} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, {useCallback, useContext, useEffect, useState} from "react";
import {PlatformPressable} from "@react-navigation/elements";
import * as ImagePicker from 'expo-image-picker';
import {ImagePickerResult} from "expo-image-picker";
import {imgToTensorFloat32, imgToTensorUint8} from "@/utils/modelUtils"
import * as onnx from "onnxruntime-react-native"
import FaceDetection from '@react-native-ml-kit/face-detection';


import ModelContext from "@/app/modelContext";
import DbContext from "@/app/dbContext";
import {useNavigation} from "expo-router";
import {ImageResult, manipulateAsync} from "expo-image-manipulator";
import {useImmer} from "use-immer";

export default function Modal() {
    const [resImage, setResImage] = useImmer<ImageResult[]>([])
    const [pickedImage, setPickedImage] = useState<ImagePickerResult>()
    const model = useContext(ModelContext);
    const db = useContext(DbContext)
    const [finalFaceEmbedding, setFinalFaceEmbedding] = useState<string>()
    const [faceEmbedding, setFaceEmbedding] = useImmer<string[]>([])
    const [name, setName] = useState<string>()
    const nav = useNavigation()
    const modelIter = 5

    /**
     * Calculate the mean embedding from a list of face embeddings.
     * @param {Array<Array<number>>} embeddings - An array of face embeddings, each represented as an array of numbers.
     * @returns {Array<number>} - The mean embedding.
     */
    function calculateMeanEmbedding(embeddings: number[][]) {
        if (!embeddings.length) {
            throw new Error("No embeddings provided.");
        }

        const embeddingLength = embeddings[0].length;

        // Initialize an array to store the sum of each dimension
        const sum = new Array(embeddingLength).fill(0);

        // Sum each dimension across all embeddings
        embeddings.forEach(embedding => {
            if (embedding.length !== embeddingLength) {
                throw new Error("Inconsistent embedding dimensions.");
            }
            embedding.forEach((value, index) => {
                sum[index] += value;
            });
        });

        // Calculate the mean for each dimension
        const meanEmbedding = sum.map(value => value / embeddings.length);

        // Normalize the resulting mean embedding (if necessary)
        const magnitude = Math.sqrt(meanEmbedding.reduce((acc, val) => acc + val * val, 0));
        return meanEmbedding.map(value => value / magnitude);
    }


    async function addUsertoDB() {
        await db.transaction(async (tx) => {
            try {

                let res = await tx.execute("insert into registered_people (name) values (?)", [name])
                console.log(res.insertId)

                for (const embedding of faceEmbedding) {
                    await tx.execute("insert into face_embedding (id,face_embedding) values (?,vec_f32(?))", [res.insertId, embedding])
                }
                nav.goBack()
            } catch (e) {
                console.error(e)
            }
        })
    }


    async function handlePickImageSingle() {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            selectionLimit: 5,
            quality: 1,
        });
        console.log(result)
        setPickedImage(result)
        if (!result.canceled) {
            for (const asset of result.assets) {

                const faces = await FaceDetection.detect(asset.uri);
                console.log(faces[0].frame)

                const img = await manipulateAsync("file://" + asset.uri, manipActions)
                // @ts-ignore
                setResImage([...resImage, img])
                const imgTensor = await imgToTensorFloat32(img)
                console.log("tensor")
                const feeds: Record<string, onnx.Tensor> = {};
                feeds[model.inputNames[0]] = imgTensor
                const modelRes = await model?.run(feeds)
                if (modelRes) {
                    // @ts-ignore
                    const modelEmbedding = `[${modelRes[model.outputNames[0]]["cpuData"].toString()}]`
                    console.log(modelEmbedding)
                    // @ts-ignore
                    setFaceEmbedding([...faceEmbedding, modelEmbedding])
                }

            }
        }
    }

    const addEmbedding = useCallback((embedding: string) => {
        setFaceEmbedding((draft) => {
            draft.push(embedding);
        });
    }, []);
    const addResImage = useCallback((resImege: ImageResult) => {
        setResImage((draft) => {
            draft.push(resImege);
        });
    }, []);

    function handlePickImage() {
        ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            selectionLimit: 5,
            quality: 1,
        })
            .then(result => {
                console.log(result);
                setPickedImage(result);

                if (!result.canceled) {
                    const assetPromises = result.assets.map(asset => {
                            FaceDetection.detect(asset.uri)
                                .then(faces => {
                                    if (faces.length === 0) {
                                        throw new Error("No faces detected");
                                    }
                                    const faceFrame = faces[0].frame;
                                    const manipActions = [
                                        {
                                            crop: {
                                                originX: faces[0].frame.left,
                                                originY: faces[0].frame.top,
                                                height: faces[0].frame.height,
                                                width: faces[0].frame.width
                                            }
                                        },
                                        {
                                            resize:{
                                                width:112,
                                                height:112
                                            }
                                        }
                                    ]
                                    return manipulateAsync("file://" + asset.uri, manipActions, {base64: true});
                                })
                                .then(imgResCrop => {
                                    // @ts-ignore
                                    addResImage(imgResCrop);
                                    return imgToTensorFloat32(imgResCrop);
                                })
                                .then(imgTensor => {
                                    const feeds = {};
                                    // @ts-ignore
                                    feeds[model.inputNames[0]] = imgTensor;
                                    return model?.run(feeds);
                                })
                                .then(modelRes => {
                                    if (modelRes) {
                                        // @ts-ignore
                                        const modelEmbedding = `[${modelRes[model.outputNames[0]]["cpuData"].toString()}]`;
                                        addEmbedding(modelEmbedding);
                                    }
                                })
                                .catch(error => {
                                    console.error("Error processing asset:", error);
                                })
                        }
                    );

                    return Promise.all(assetPromises);
                }
            })
            .catch(error => {
                console.error("Error picking image:", error);
            });
    }

    return <View style={styles.container}>
        <TextInput placeholder={"Enter Student Name"} onChangeText={setName} value={name} style={styles.input}/>
        <PlatformPressable style={[styles.input, {
            alignItems: "center",
            justifyContent: "center",
            alignSelf: "center",
            display: "flex",
            width: "100%"
        }]} onPress={handlePickImage}>
            <View
                style={{

                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "space-between"
                }}>
                {(!pickedImage || pickedImage?.canceled) &&
                    <MaterialIcons color={"black"} size={50} name={"add-a-photo"}/>}
                {resImage?.map((img, i) => <Image key={i} source={{uri: img.uri}}
                                                  style={{height: 50, width: 50}}/>)}

            </View>
        </PlatformPressable>

        <Button onPress={addUsertoDB} title={"Add Student"} disabled={(faceEmbedding?.length !== 5)}/>
    </View>
}

const styles = StyleSheet.create({
    container: {
        padding: 20
    },
    input: {
        padding: 10,
        paddingTop: 20,
        paddingBottom: 20,
        marginTop: 5,
        marginBottom: 5,
        borderRadius: 7,
        borderStyle: "solid",
        borderWidth: .5,
    }
})