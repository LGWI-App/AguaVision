import { Image } from "expo-image";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { useSession } from "../components/auth/ctx";

const blurhash =
  "|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj[";

export default function SignIn() {
  const { signIn } = useSession();
  return (
    <View style={styles.container}>
      <Image
        style={styles.image}
        source={require("../assets/images/logo.png")}
        // placeholder={{ blurhash }}
        contentFit="contain"
      />
      <Text
        style={styles.button}
        onPress={() => {
          signIn();

          router.replace("/");
        }}
      >
        Log In
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  button: {
    backgroundColor: "#006699",
    color: "white",
    fontSize: 16,
    paddingHorizontal: 79,
    paddingVertical: 18,
    borderRadius: 30,
  },
  image: {
    width: 200,
    height: 200,
    marginBottom: 40,
  },
});
