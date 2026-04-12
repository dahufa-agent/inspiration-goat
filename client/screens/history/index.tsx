import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
} from "react-native";
import { Screen } from "@/components/Screen";
import { useSafeRouter, useSafeSearchParams } from "@/hooks/useSafeRouter";
import * as SecureStore from "expo-secure-store";

const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || "http://localhost:9091";

interface HistoryItem {
  id: string;
  prompt: string;
  imageUrls: string[];
  text?: string;
  videoUrl?: string;
  createdAt: string;
  isFavorite: boolean;
}

export default function HistoryScreen() {
  const router = useSafeRouter();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "images" | "videos" | "favorites">("all");

  // 加载历史记录
  useEffect(() => {
    const load = async () => {
      try {
        const stored = await SecureStore.getItemAsync("generationHistory");
        if (stored) {
          setHistory(JSON.parse(stored));
        }
      } catch (err) {
        console.error("Load history error:", err);
      }
    };
    load();
  }, []);

  const toggleFavorite = async (item: HistoryItem) => {
    const updated = history.map((h) =>
      h.id === item.id ? { ...h, isFavorite: !h.isFavorite } : h
    );
    setHistory(updated);
    await SecureStore.setItemAsync("generationHistory", JSON.stringify(updated));
  };

  const deleteItem = (item: HistoryItem) => {
    Alert.alert("删除确认", "确定要删除这条记录吗？", [
      { text: "取消", style: "cancel" },
      {
        text: "删除",
        style: "destructive",
        onPress: async () => {
          const updated = history.filter((h) => h.id !== item.id);
          setHistory(updated);
          await SecureStore.setItemAsync("generationHistory", JSON.stringify(updated));
        },
      },
    ]);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const stored = await SecureStore.getItemAsync("generationHistory");
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Refresh history error:", err);
    }
    setRefreshing(false);
  }, []);

  const filteredHistory = history.filter((item) => {
    if (filter === "all") return true;
    if (filter === "images") return item.imageUrls && item.imageUrls.length > 0;
    if (filter === "videos") return item.videoUrl;
    if (filter === "favorites") return item.isFavorite;
    return true;
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return "今天";
    if (days === 1) return "昨天";
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString("zh-CN");
  };

  return (
    <Screen>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>{"< 返回"}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>生成历史</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterTabs}>
          {[
            { key: "all", label: "全部", count: history.length },
            { key: "images", label: "图片", count: history.filter(h => h.imageUrls?.length > 0).length },
            { key: "videos", label: "视频", count: history.filter(h => h.videoUrl).length },
            { key: "favorites", label: "收藏", count: history.filter(h => h.isFavorite).length },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.filterTab, filter === tab.key && styles.filterTabActive]}
              onPress={() => setFilter(tab.key as typeof filter)}
            >
              <Text style={[styles.filterText, filter === tab.key && styles.filterTextActive]}>
                {tab.label}
              </Text>
              <Text style={[styles.filterCount, filter === tab.key && styles.filterCountActive]}>
                {tab.count}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* History List */}
        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredHistory.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>[ ]</Text>
              <Text style={styles.emptyTitle}>暂无记录</Text>
              <Text style={styles.emptyDesc}>
                {filter === "favorites"
                  ? "还没有收藏任何内容"
                  : "去首页生成你的第一个作品吧"}
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.back()}
              >
                <Text style={styles.emptyButtonText}>去生成</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredHistory.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.historyCard}
                onPress={() => {
                  if (item.videoUrl) {
                    router.push("/edit", {
                      images: JSON.stringify(item.imageUrls || []),
                      text: item.text || "",
                      videoUrl: item.videoUrl,
                      prompt: item.prompt,
                    });
                  }
                }}
              >
                {/* Media Preview */}
                <View style={styles.cardMedia}>
                  {item.imageUrls && item.imageUrls.length > 0 ? (
                    <Image source={{ uri: item.imageUrls[0] }} style={styles.thumbnail} />
                  ) : item.videoUrl ? (
                    <View style={styles.videoPlaceholder}>
                      <Text style={styles.playIcon}>{">"}</Text>
                    </View>
                  ) : (
                    <View style={styles.textPlaceholder}>
                      <Text style={styles.textIcon}>Aa</Text>
                    </View>
                  )}
                  
                  {/* Badges */}
                  <View style={styles.badges}>
                    {item.imageUrls && item.imageUrls.length > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.imageUrls.length}图</Text>
                      </View>
                    )}
                    {item.videoUrl && (
                      <View style={[styles.badge, { backgroundColor: "#EF4444" }]}>
                        <Text style={styles.badgeText}>视频</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Card Info */}
                <View style={styles.cardInfo}>
                  <Text style={styles.cardPrompt} numberOfLines={2}>
                    {item.prompt}
                  </Text>
                  <View style={styles.cardMeta}>
                    <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
                    {item.text && (
                      <Text style={styles.cardTextPreview} numberOfLines={1}>
                        {item.text.substring(0, 30)}...
                      </Text>
                    )}
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => toggleFavorite(item)}
                  >
                    <Text style={styles.actionIcon}>
                      {item.isFavorite ? "[*]" : "[ ]"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => deleteItem(item)}
                  >
                    <Text style={styles.actionIcon}>[x]</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
          
          <View style={styles.bottomPadding} />
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 60,
  },
  backText: {
    fontSize: 16,
    color: "#4F46E5",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  placeholder: {
    width: 60,
  },
  filterTabs: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 4,
  },
  filterTabActive: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  filterText: {
    fontSize: 13,
    color: "#6B7280",
  },
  filterTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  filterCount: {
    fontSize: 11,
    color: "#9CA3AF",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  filterCountActive: {
    color: "#FFFFFF",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  historyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardMedia: {
    height: 180,
    backgroundColor: "#F3F4F6",
    position: "relative",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  videoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1F2937",
  },
  playIcon: {
    fontSize: 48,
    color: "#FFFFFF",
  },
  textPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  textIcon: {
    fontSize: 48,
  },
  badges: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    gap: 6,
  },
  badge: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
  },
  cardInfo: {
    padding: 16,
  },
  cardPrompt: {
    fontSize: 15,
    color: "#1F2937",
    lineHeight: 22,
    marginBottom: 8,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardDate: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  cardTextPreview: {
    fontSize: 12,
    color: "#6B7280",
    flex: 1,
    marginLeft: 12,
    textAlign: "right",
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 16,
  },
  actionButton: {
    padding: 8,
  },
  actionIcon: {
    fontSize: 20,
  },
  bottomPadding: {
    height: 40,
  },
});
