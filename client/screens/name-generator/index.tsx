import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Screen } from "@/components/Screen";
import { FontAwesome6 } from "@expo/vector-icons";

const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || "http://localhost:9091";

// 姓氏分类
const SURNAME_TYPES = [
  { id: "single", name: "单姓", desc: "如：张、李、王" },
  { id: "compound", name: "复姓", desc: "如：欧阳、司马" },
];

// 起名类型
const NAME_TYPES = [
  { id: "full", name: "全名", icon: "user", color: "#DC2626" },
  { id: "given", name: "单字名", icon: "signature", color: "#059669" },
];

export default function NameGeneratorScreen() {
  const [surname, setSurname] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [surnameType, setSurnameType] = useState("single");
  const [nameType, setNameType] = useState("full");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleGenerate = async () => {
    if (!surname.trim() || !birthDate.trim() || !gender) return;
    setLoading(true);
    // 模拟生成
    setTimeout(() => {
      setResult({
        names: nameType === "full" 
          ? ["诗涵", "梓萱", "浩然", "晨曦"]
          : ["轩", "涵", "瑶", "琳"],
        wuxing: ["木", "火", "土", "金", "水"],
        score: 92,
        suggestion: "推荐：诗涵，五行属木，大吉",
      });
      setLoading(false);
    }, 2000);
  };

  return (
    <Screen className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* 标题区 */}
        <View className="px-4 pt-4 pb-6 bg-gradient-to-r from-amber-600 to-orange-500">
          <Text className="text-2xl font-bold text-white">AI智能起名</Text>
          <Text className="text-amber-100 mt-1">八字五行 · 姓名评分 · 吉祥寓意</Text>
        </View>

        <View className="px-4 py-4">
          {/* 姓氏输入 */}
          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="font-bold text-gray-900 mb-3">姓氏选择</Text>
            <View className="flex-row -mx-2 mb-3">
              {SURNAME_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  className={`flex-1 mx-2 p-3 rounded-xl border-2 ${
                    surnameType === type.id
                      ? "border-amber-500 bg-amber-50"
                      : "border-gray-200"
                  }`}
                  onPress={() => setSurnameType(type.id)}
                >
                  <Text
                    className={`text-center font-bold ${
                      surnameType === type.id ? "text-amber-600" : "text-gray-700"
                    }`}
                  >
                    {type.name}
                  </Text>
                  <Text
                    className={`text-center text-xs mt-1 ${
                      surnameType === type.id ? "text-amber-500" : "text-gray-400"
                    }`}
                  >
                    {type.desc}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900"
              placeholder="请输入姓氏"
              placeholderTextColor="#9CA3AF"
              value={surname}
              onChangeText={setSurname}
            />
          </View>

          {/* 出生日期 */}
          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="font-bold text-gray-900 mb-2">出生日期</Text>
            <TextInput
              className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900"
              placeholder="例如：2024-01-15 10:30"
              placeholderTextColor="#9CA3AF"
              value={birthDate}
              onChangeText={setBirthDate}
            />
          </View>

          {/* 性别选择 */}
          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="font-bold text-gray-900 mb-3">性别</Text>
            <View className="flex-row -mx-2">
              <TouchableOpacity
                className={`flex-1 mx-2 p-4 rounded-xl border-2 ${
                  gender === "male"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200"
                }`}
                onPress={() => setGender("male")}
              >
                <FontAwesome6
                  name="mars"
                  size={24}
                  color={gender === "male" ? "#3B82F6" : "#9CA3AF"}
                />
                <Text
                  className={`text-center font-bold mt-2 ${
                    gender === "male" ? "text-blue-600" : "text-gray-700"
                  }`}
                >
                  男
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 mx-2 p-4 rounded-xl border-2 ${
                  gender === "female"
                    ? "border-pink-500 bg-pink-50"
                    : "border-gray-200"
                }`}
                onPress={() => setGender("female")}
              >
                <FontAwesome6
                  name="venus"
                  size={24}
                  color={gender === "female" ? "#EC4899" : "#9CA3AF"}
                />
                <Text
                  className={`text-center font-bold mt-2 ${
                    gender === "female" ? "text-pink-600" : "text-gray-700"
                  }`}
                >
                  女
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 起名类型 */}
          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="font-bold text-gray-900 mb-3">起名类型</Text>
            <View className="flex-row -mx-2">
              {NAME_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  className={`flex-1 mx-2 p-3 rounded-xl border-2 ${
                    nameType === type.id
                      ? "border-amber-500 bg-amber-50"
                      : "border-gray-200"
                  }`}
                  onPress={() => setNameType(type.id)}
                >
                  <FontAwesome6
                    name={type.icon as any}
                    size={20}
                    color={nameType === type.id ? type.color : "#9CA3AF"}
                  />
                  <Text
                    className={`text-center font-bold mt-2 ${
                      nameType === type.id ? "text-amber-600" : "text-gray-700"
                    }`}
                  >
                    {type.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 生成按钮 */}
          <TouchableOpacity
            className="bg-gradient-to-r from-amber-500 to-orange-500 py-4 rounded-2xl shadow-lg"
            onPress={handleGenerate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-center font-bold">AI智能起名</Text>
            )}
          </TouchableOpacity>

          {/* 结果展示 */}
          {result && (
            <View className="mt-4 bg-white rounded-2xl p-4">
              <View className="flex-row items-center mb-4">
                <FontAwesome6 name="star" size={20} color="#F59E0B" />
                <Text className="font-bold text-gray-900 ml-2">推荐姓名</Text>
              </View>
              <View className="flex-row flex-wrap -mx-2">
                {result.names.map((name, idx) => (
                  <TouchableOpacity
                    key={idx}
                    className="w-1/2 px-2 mb-2"
                  >
                    <View className="bg-amber-50 rounded-xl p-4 items-center border border-amber-200">
                      <Text className="text-2xl font-bold text-amber-600">{surname}{name}</Text>
                      <Text className="text-xs text-amber-500 mt-1">五行：{result.wuxing[idx]}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
              <View className="bg-amber-50 rounded-xl p-3 mt-4">
                <Text className="text-amber-800 text-sm">{result.suggestion}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
