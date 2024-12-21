import {Asset} from "expo-asset";
import * as onnx from "onnxruntime-react-native"
import {createContext} from "react";
import {DB} from "@op-engineering/op-sqlite";


const modelContext = createContext<onnx.InferenceSession>(null);

export default modelContext