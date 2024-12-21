import {StyleSheet, Image, Platform, FlatList} from 'react-native';

import {useNavigation} from "expo-router";
import PersonInList from "@/components/personInList";
import {useContext, useEffect, useState} from "react";
import dbContext from "@/app/dbContext";
import {QueryResult} from "@op-engineering/op-sqlite";
import {useIsFocused} from "@react-navigation/core";

export default function TabTwoScreen() {
    console.log(useNavigation().getState().index)
    const db = useContext(dbContext)
    const [rowsUnprocc, setRowsUnprocc] = useState<QueryResult>()
    const isFocused = useIsFocused()

    useEffect(() => {
        if (isFocused)
            db.execute("SELECT * FROM registered_people").then(setRowsUnprocc);

    }, [isFocused]);

    // @ts-ignore
    return (
        <FlatList data={rowsUnprocc?.rows}
                  renderItem={i =>
                      <PersonInList name={`${i.item.name}`} id={parseInt(i.item.id,10)}/>}/>
    );
}

