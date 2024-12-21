import {Buffer} from "buffer";
import {ImagePickerResult} from "expo-image-picker";
import {ImageResult, manipulateAsync} from "expo-image-manipulator";
import * as jpeg from 'jpeg-js';
import * as onnx from "onnxruntime-react-native"

export async function imgToTensorFloat32(img: ImageResult) {
    console.log("imgToTensor", img)
    let buf: Float32Array<ArrayBuffer>;
    // @ts-ignore
    buf = new Float32Array(Buffer.from(img.base64, 'base64'));

    const {width, height, data} = jpeg.decode(buf, {useTArray: true});

    // Normalize pixel values and convert to Float32Array
    const float32Array = new Float32Array(width * height * 3);
    for (let i = 0; i < width * height; i++) {
        float32Array[i * 3 + 0] = data[i * 4 + 0] / 255; // Red
        float32Array[i * 3 + 1] = data[i * 4 + 1] / 255; // Green
        float32Array[i * 3 + 2] = data[i * 4 + 2] / 255; // Blue
    }

    return new onnx.Tensor("float32", float32Array, [1, height, width, 3]);
}

export async function imgToTensorUint8(img: ImageResult) {
    console.log("imgToTensor", img);
    let buf: Uint8Array;
    // @ts-ignore
    buf = new Uint8Array(Buffer.from(img.base64, 'base64'));

    const {width, height, data} = jpeg.decode(buf, {useTArray: true});

    // Create a Uint8Array for the pixel values
    const uint8Array = new Uint8Array(width * height * 3);
    for (let i = 0; i < width * height; i++) {
        uint8Array[i * 3 + 0] = data[i * 4 + 0]; // Red
        uint8Array[i * 3 + 1] = data[i * 4 + 1]; // Green
        uint8Array[i * 3 + 2] = data[i * 4 + 2]; // Blue
    }

    return new onnx.Tensor("uint8", uint8Array, [1, height, width, 3]);
}