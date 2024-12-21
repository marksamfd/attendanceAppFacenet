import {Link, Tabs, useNavigation} from 'expo-router';
import React from 'react';
import {Platform, Pressable} from 'react-native';

import {HapticTab} from '@/components/HapticTab';
import {IconSymbol} from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import {Colors} from '@/constants/Colors';
import {useColorScheme} from '@/hooks/useColorScheme';
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {PlatformPressable} from "@react-navigation/elements";

export default function TabLayout() {
    const colorScheme = useColorScheme();

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
                headerShown: false,
                tabBarButton: HapticTab,
                tabBarBackground: TabBarBackground,
                tabBarStyle: Platform.select({
                    ios: {
                        // Use a transparent background on iOS to show the blur effect
                        position: 'absolute',
                    },
                    default: {},
                }),
            }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({color}) => <IconSymbol size={28} name="house.fill" color={color}/>,
                }}
            />
            <Tabs.Screen
                name="explore"

                options={{
                    headerShown: true,
                    headerRight: () => <Link href={"../modal"}><MaterialIcons color={"black"} size={28} name={"add"}
                    /></Link>,
                    title: 'All Students',
                    tabBarIcon: ({color}) => <IconSymbol size={28} name="person.add" color={color}/>,
                }}
            />
        </Tabs>
    )
        ;
}
