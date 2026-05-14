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

// 国学典籍分类
const CLASSICS_CATEGORIES = [
  { id: "yijing", name: "易经", icon: "yin-yang", color: "#DC2626", desc: "群经之首" },
  { id: "daodejing", name: "道德经", icon: "book", color: "#059669", desc: "道家经典" },
  { id: "tangshi", name: "唐诗", icon: "feather", color: "#7C3AED", desc: "诗意盎然" },
  { id: "songci", name: "宋词", icon: "brush", color: "#0891B2", desc: "婉约豪放" },
  { id: "lunyu", name: "论语", icon: "comments", color: "#D97706", desc: "儒家智慧" },
  { id: "chuangzi", name: "庄子", icon: "leaf", color: "#10B981", desc: "逍遥自在" },
];

// 典籍内容
const CLASSICS_CONTENT: Record<string, any> = {
  yijing: {
    chapters: ["乾卦", "坤卦", "屯卦", "蒙卦", "需卦"],
    sample: "乾：元亨利贞。初九：潜龙勿用。九二：见龙在田，利见大人。",
  },
  daodejing: [
    "道可道，非常道。名可名，非常名。",
    "上善若水，水善利万物而不争。",
    "致虚极，守静笃。万物并作，吾以观复。",
  ],
  tangshi: [
    { title: "静夜思", author: "李白", content: "床前明月光，疑是地上霜。举头望明月，低头思故乡。" },
    { title: "春晓", author: "孟浩然", content: "春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。" },
  ],
  songci: [
    { title: "水调歌头", author: "苏轼", content: "明月几时有？把酒问青天。不知天上宫阙，今夕是何年？" },
  ],
};

export default function ClassicsScreen() {
  const [selectedCategory, setSelectedCategory] = useState("tangshi");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSearch = async () => {
    setLoading(true);
    setTimeout(() => {
      const content = CLASSICS_CONTENT[selectedCategory];
      if (selectedCategory === "tangshi") {
        setResult(content);
      } else if (selectedCategory === "songci") {
        setResult(content);
      } else if (selectedCategory === "daodejing") {
        setResult(content);
      }
      setLoading(false);
    }, 1000);
  };

  return (
    <Screen className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* 标题区 */}
        <View className="px-4 pt-4 pb-6 bg-gradient-to-r from-amber-700 to-red-600">
          <Text className="text-2xl font-bold text-white">国学典籍</Text>
          <Text className="text-amber-100 mt-1">易经 · 道德经 · 唐诗 · 宋词</Text>
        </View>

        <View className="px-4 py-4">
          {/* 典籍分类 */}
          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="font-bold text-gray-900 mb-3">选择典籍</Text>
            <View className="flex-row flex-wrap -mx-2">
              {CLASSICS_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  className="w-1/3 px-2 mb-2"
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <View
                    className={`p-3 rounded-xl border-2 items-center ${
                      selectedCategory === cat.id
                        ? "border-red-500 bg-red-50"
                        : "border-gray-200"
                    }`}
                  >
                    <FontAwesome6 name={cat.icon as any} size={20} color={cat.color} />
                    <Text
                      className={`font-bold mt-1 ${
                        selectedCategory === cat.id ? "text-red-600" : "text-gray-700"
                      }`}
                    >
                      {cat.name}
                    </Text>
                    <Text className="text-xs text-gray-400">{cat.desc}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 搜索框 */}
          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="font-bold text-gray-900 mb-2">关键词搜索</Text>
            <View className="flex-row items-center">
              <TextInput
                className="flex-1 bg-gray-50 rounded-xl px-4 py-3 text-gray-900"
                placeholder="输入关键词，如：月亮、思乡"
                placeholderTextColor="#9CA3AF"
                value={keyword}
                onChangeText={setKeyword}
              />
              <TouchableOpacity
                className="ml-3 bg-gradient-to-r from-red-500 to-amber-500 px-6 py-3 rounded-xl"
                onPress={handleSearch}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <FontAwesome6 name="search" size={18} color="white" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* 典籍内容展示 */}
          {selectedCategory === "tangshi" && CLASSICS_CONTENT.tangshi && (
            <View className="bg-white rounded-2xl p-4 mb-4">
              <View className="flex-row items-center mb-3">
                <FontAwesome6 name="feather" size={18} color="#7C3AED" />
                <Text className="font-bold text-gray-900 ml-2">唐诗精选</Text>
              </View>
              {CLASSICS_CONTENT.tangshi.map((poem, idx) => (
                <View key={idx} className="bg-purple-50 rounded-xl p-4 mb-3">
                  <Text className="text-lg font-bold text-purple-700">{poem.title}</Text>
                  <Text className="text-purple-500 text-sm">{poem.author}</Text>
                  <Text className="text-gray-700 mt-2 leading-6">{poem.content}</Text>
                </View>
              ))}
            </View>
          )}

          {selectedCategory === "daodejing" && CLASSICS_CONTENT.daodejing && (
            <View className="bg-white rounded-2xl p-4 mb-4">
              <View className="flex-row items-center mb-3">
                <FontAwesome6 name="book" size={18} color="#059669" />
                <Text className="font-bold text-gray-900 ml-2">道德经精选</Text>
              </View>
              {CLASSICS_CONTENT.daodejing.map((quote, idx) => (
                <View key={idx} className="bg-green-50 rounded-xl p-4 mb-3">
                  <Text className="text-gray-700 leading-7">{quote}</Text>
                </View>
              ))}
            </View>
          )}

          {selectedCategory === "yijing" && (
            <View className="bg-white rounded-2xl p-4 mb-4">
              <View className="flex-row items-center mb-3">
                <FontAwesome6 name="yin-yang" size={18} color="#DC2626" />
                <Text className="font-bold text-gray-900 ml-2">易经 · 乾卦</Text>
              </View>
              <View className="bg-red-50 rounded-xl p-4">
                <Text className="text-gray-700 leading-7">{CLASSICS_CONTENT.yijing.sample}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
