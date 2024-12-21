import {VisionCameraProxy, Frame} from 'react-native-vision-camera'
import {Face} from "react-native-vision-camera-face-detector";

const plugin = VisionCameraProxy.initFrameProcessorPlugin('recognizeFace')

export function recognizeFace(frame: Frame, face: Face) {
    'worklet'
    if (plugin == null) {
        throw new Error("Failed to load Frame Processor Plugin!")
    }
    console.log()

    return plugin.call(frame, {...face.bounds} )
}

