import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions, } from "react-native";
import { Image } from "expo-image"; // 高性能图片组件
import { FontAwesome6 } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { useSafeRouter } from "@/hooks/useSafeRouter";
import * as SecureStore from "expo-secure-store";
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_MARGIN = 16;
const CARD_WIDTH = (SCREEN_WIDTH - CARD_MARGIN * 3) / 2;
// 历史卡片组件 - 使用 memo 优化防止不必要的重渲染
const HistoryCard = memo(({ item, onToggleFavorite, onDelete, onPress }) => {
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days === 0)
            return "今天";
        if (days === 1)
            return "昨天";
        if (days < 7)
            return `${days}天前`;
        return date.toLocaleDateString("zh-CN");
    };
    return (<TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {/* Media Preview */}
      <View style={styles.cardMedia}>
        {item.imageUrls && item.imageUrls.length > 0 ? (<Image source={{ uri: item.imageUrls[0] }} style={styles.thumbnail} contentFit="cover" transition={200} cachePolicy="memory-disk" placeholder={{ blurhash: "L6PZfSi_.AyE_3t7t7R**0o#DgR4" }}/>) : item.videoUrl ? (<View style={styles.videoPlaceholder}>
            <FontAwesome6 name="play" size={28} color="#FFFFFF"/>
          </View>) : (<View style={styles.textPlaceholder}>
            <FontAwesome6 name="font" size={24} color="#9CA3AF"/>
          </View>)}
        
        {/* Badges */}
        <View style={styles.badges}>
          {item.imageUrls && item.imageUrls.length > 0 && (<View style={styles.badge}>
              <Text style={styles.badgeText}>{item.imageUrls.length}图</Text>
            </View>)}
          {item.videoUrl && (<View style={[styles.badge, { backgroundColor: "#EF4444" }]}>
              <FontAwesome6 name="video" size={10} color="#FFFFFF"/>
            </View>)}
        </View>
      </View>

      {/* Card Info */}
      <View style={styles.cardInfo}>
        <Text style={styles.cardPrompt} numberOfLines={2}>
          {item.prompt}
        </Text>
        <View style={styles.cardMeta}>
          <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionButton} onPress={onToggleFavorite}>
          <FontAwesome6 name={item.isFavorite ? "heart" : "heart"} size={16} color={item.isFavorite ? "#EF4444" : "#9CA3AF"}/>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={onDelete}>
          <FontAwesome6 name="trash" size={16} color="#9CA3AF"/>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>);
});
export default function HistoryScreen() {
    const router = useSafeRouter();
    const [history, setHistory] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState("all");
    // 加载历史记录
    useEffect(() => {
        const load = async () => {
            try {
                const stored = await SecureStore.getItemAsync("generationHistory");
                if (stored) {
                    setHistory(JSON.parse(stored));
                }
            }
            catch (err) {
                console.error("Load history error:", err);
            }
        };
        load();
    }, []);
    // 使用 useMemo 缓存过滤后的数据
    const filteredHistory = useMemo(() => {
        return history.filter((item) => {
            if (filter === "all")
                return true;
            if (filter === "images")
                return item.imageUrls && item.imageUrls.length > 0;
            if (filter === "videos")
                return item.videoUrl;
            if (filter === "favorites")
                return item.isFavorite;
            return true;
        });
    }, [history, filter]);
    // 使用 useMemo 缓存统计数据
    const stats = useMemo(() => ({
        all: history.length,
        images: history.filter(h => h.imageUrls?.length > 0).length,
        videos: history.filter(h => h.videoUrl).length,
        favorites: history.filter(h => h.isFavorite).length,
    }), [history]);
    const toggleFavorite = useCallback(async (item) => {
        const updated = history.map((h) => h.id === item.id ? { ...h, isFavorite: !h.isFavorite } : h);
        setHistory(updated);
        await SecureStore.setItemAsync("generationHistory", JSON.stringify(updated));
    }, [history]);
    const deleteItem = useCallback((item) => {
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
    }, [history]);
    const handlePress = useCallback((item) => {
        if (item.videoUrl || (item.imageUrls && item.imageUrls.length > 0)) {
            router.push("/edit", {
                images: JSON.stringify(item.imageUrls || []),
                text: item.text || "",
                videoUrl: item.videoUrl || "",
                prompt: item.prompt,
            });
        }
    }, [router]);
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            const stored = await SecureStore.getItemAsync("generationHistory");
            if (stored) {
                setHistory(JSON.parse(stored));
            }
        }
        catch (err) {
            console.error("Refresh history error:", err);
        }
        setRefreshing(false);
    }, []);
    // 渲染空状态
    const renderEmpty = () => (<View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>[ ]</Text>
      <Text style={styles.emptyTitle}>暂无记录</Text>
      <Text style={styles.emptyDesc}>
        {filter === "favorites"
            ? "还没有收藏任何内容"
            : "去首页生成你的第一个作品吧"}
      </Text>
      <TouchableOpacity style={styles.emptyButton} onPress={() => router.back()}>
        <Text style={styles.emptyButtonText}>去生成</Text>
      </TouchableOpacity>
    </View>);
    return (<Screen>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>{"< 返回"}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>生成历史</Text>
          <View style={styles.placeholder}/>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterTabs}>
          {([
            { key: "all", label: "全部" },
            { key: "images", label: "图片" },
            { key: "videos", label: "视频" },
            { key: "favorites", label: "收藏" },
        ]).map((tab) => (<TouchableOpacity key={tab.key} style={[styles.filterTab, filter === tab.key && styles.filterTabActive]} onPress={() => setFilter(tab.key)}>
              <Text style={[styles.filterText, filter === tab.key && styles.filterTextActive]}>
                {tab.label}
              </Text>
              <Text style={[styles.filterCount, filter === tab.key && styles.filterCountActive]}>
                {stats[tab.key]}
              </Text>
            </TouchableOpacity>))}
        </View>

        {/* History Grid - 使用 FlatList 优化大数据渲染 */}
        {filteredHistory.length === 0 ? (renderEmpty()) : (<View style={styles.listContainer}>
            <View style={styles.gridContainer}>
              {filteredHistory.map((item) => (<HistoryCard key={item.id} item={item} onToggleFavorite={() => toggleFavorite(item)} onDelete={() => deleteItem(item)} onPress={() => handlePress(item)}/>))}
            </View>
          </View>)}
      </View>
    </Screen>);
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8FAFC",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 16,
        backgroundColor: "#FFFFFF",
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        shadowColor: "#4F46E5",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    backButton: {
        width: 60,
        flexDirection: "row",
        alignItems: "center",
    },
    backText: {
        fontSize: 15,
        color: "#4F46E5",
        fontWeight: "500",
    },
    title: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
    },
    placeholder: {
        width: 60,
    },
    filterTabs: {
        flexDirection: "row",
        paddingHorizontal: 20,
        marginTop: 16,
        marginBottom: 16,
        gap: 10,
    },
    filterTab: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        paddingHorizontal: 8,
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
        gap: 6,
    },
    filterTabActive: {
        backgroundColor: "#4F46E5",
    },
    filterText: {
        fontSize: 13,
        color: "#6B7280",
        fontWeight: "500",
    },
    filterTextActive: {
        color: "#FFFFFF",
        fontWeight: "600",
    },
    filterCount: {
        fontSize: 11,
        color: "#9CA3AF",
        backgroundColor: "#F1F5F9",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    filterCountActive: {
        color: "#FFFFFF",
        backgroundColor: "rgba(255,255,255,0.25)",
    },
    listContainer: {
        flex: 1,
    },
    gridContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        paddingHorizontal: CARD_MARGIN,
        paddingBottom: 20,
        gap: CARD_MARGIN,
    },
    emptyState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 80,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 20,
        color: "#E2E8F0",
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
        marginBottom: 28,
    },
    emptyButton: {
        backgroundColor: "#4F46E5",
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 20,
        shadowColor: "#4F46E5",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    emptyButtonText: {
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "600",
    },
    // 卡片样式
    card: {
        width: CARD_WIDTH,
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        overflow: "hidden",
        shadowColor: "#4F46E5",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
    },
    cardMedia: {
        width: "100%",
        height: CARD_WIDTH * 0.75,
        backgroundColor: "#F1F5F9",
        position: "relative",
    },
    thumbnail: {
        width: "100%",
        height: "100%",
    },
    videoPlaceholder: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#1F2937",
    },
    textPlaceholder: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    badges: {
        position: "absolute",
        top: 8,
        left: 8,
        flexDirection: "row",
        gap: 6,
    },
    badge: {
        backgroundColor: "rgba(79, 70, 229, 0.9)",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    badgeText: {
        color: "#FFFFFF",
        fontSize: 11,
        fontWeight: "600",
    },
    cardInfo: {
        padding: 14,
    },
    cardPrompt: {
        fontSize: 13,
        color: "#1F2937",
        lineHeight: 19,
        marginBottom: 8,
    },
    cardMeta: {
        flexDirection: "row",
        alignItems: "center",
    },
    cardDate: {
        fontSize: 12,
        color: "#9CA3AF",
    },
    cardActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        paddingHorizontal: 12,
        paddingBottom: 12,
        gap: 14,
    },
    actionButton: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: "#F1F5F9",
        alignItems: "center",
        justifyContent: "center",
    },
});
