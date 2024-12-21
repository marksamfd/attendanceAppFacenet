import {useFonts} from 'expo-font';
import {Stack, useNavigation} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {StatusBar} from 'expo-status-bar';
import {useEffect, useState} from 'react';
import 'react-native-reanimated';
import {useColorScheme} from '@/hooks/useColorScheme';
import DbContext, {createdDb} from "@/app/dbContext";
import {Asset} from "expo-asset";
import * as onnx from "onnxruntime-react-native";
import ModelContext from "@/app/modelContext";


SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const [model, setModel] = useState<onnx.InferenceSession>()
    const [loaded] = useFonts({
        SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    });


    useEffect(() => {
        if (loaded) {
            SplashScreen.hideAsync();
        }


    }, [loaded]);

    useEffect(() => {
        Asset.loadAsync(require('../assets/models/mobile_facenet.onnx')).then(a => {
            console.log(a)
            if(a[0]) {
                return onnx.InferenceSession.create(a[0].localUri)
            }
        }).then(modelOnnx => {
            setModel(modelOnnx)
        })
    }, []);

    if (!loaded) {
        return null;
    }


    return (
        <ModelContext.Provider value={model}>
            <DbContext.Provider value={createdDb}>
                <Stack>
                    <Stack.Screen name="(tabs)" options={{headerShown: false}}/>
                    <Stack.Screen
                        name="modal"
                        options={{
                            presentation: "modal",
                            title: "Add New Student",
                        }}
                    />
                    <Stack.Screen name="+not-found"/>
                </Stack>
                <StatusBar style="auto"/>
            </DbContext.Provider>
        </ModelContext.Provider>


    );
}
