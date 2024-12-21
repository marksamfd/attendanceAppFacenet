import {StyleSheet, View, Text} from 'react-native';

export default function PersonInList(props: { name: string, id: number}) {
    return (
    <View style={[styles.container]}>
        <Text>{props.name}</Text>
        <Text style={styles.text}>{props.id}</Text>
    </View>
    )
};

const styles = StyleSheet.create({
    container: {
        paddingTop: 25,
        paddingBottom: 25,
        paddingLeft: 15,
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
    },
    text: {
        width: 100,

    }
})