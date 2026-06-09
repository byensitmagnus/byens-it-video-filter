/*
 * TikTok Creator Video Filter · constants.js
 * Delte konstanter. UMD: virker både som content-script (self.BITVF.constants)
 * og som CommonJS-modul i Node (require) til tests.
 */
;(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof self !== "undefined") { self.BITVF = self.BITVF || {}; self.BITVF.constants = api; }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Feltnavn-varianter TikTok bruger på tværs af endpoints
  var FIELDS = {
    id: ["id", "aweme_id", "awemeId", "item_id", "itemId", "video_id", "videoId", "group_id", "groupId", "itemID"],
    title: ["desc", "title", "description", "item_title", "itemTitle", "caption", "text", "video_desc", "content", "post_title"],
    views: ["play_count", "playCount", "video_views", "videoViews", "vv", "views", "view_count", "viewCount", "play", "total_play", "show_cnt", "impression", "impressions"],
    likes: ["digg_count", "diggCount", "like_count", "likeCount", "likes", "digg", "heart_count"],
    comments: ["comment_count", "commentCount", "comments"],
    shares: ["share_count", "shareCount", "shares", "forward_count", "forwardCount"],
    saves: ["collect_count", "collectCount", "favorite_count", "favoriteCount", "save_count", "saveCount", "saves", "favorites", "favourite_count", "collect"],
    created: ["create_time", "createTime", "createTimestamp", "create_timestamp", "created_at", "createdAt", "publish_time", "publishTime", "create_date"]
  };
  var STAT_CONTAINERS = ["statistics", "stats", "statisticsV2", "statsV2", "metrics", "itemStats", "item_stats"];

  var STORAGE_KEYS = { videos: "bit_videos", snapshots: "bit_snapshots", watchlist: "bit_watchlist", settings: "bit_settings" };

  var DAY = 86400000;
  var SNAPSHOT_MIN_GAP = 6 * 3600 * 1000;  // min. tid mellem nye snapshots
  var SNAPSHOT_MAX = 60;                    // ringbuffer pr. video

  // Badge-tærskler (percentiler 0..1)
  var BADGE = {
    repostAgeDays: 14,
    repostPctl: 0.8,
    makeMoreSavePctl: 0.7,
    viralViewsPctl: 0.9,
    utilitySavePctl: 0.75,
    utilityMaxViewsPctl: 0.7,
    tooEarlyDays: 7
  };

  var TABS = [
    { k: "top", n: "Top" },
    { k: "leaderboard", n: "Leaderboard" },
    { k: "time", n: "Posting Times" },
    { k: "tags", n: "Hashtags & Sounds" },
    { k: "repost", n: "Repost Radar" },
    { k: "trends", n: "Trends" },
    { k: "watch", n: "★ Watchlist" }
  ];
  var SORTS = [
    { k: "score", n: "Score" }, { k: "views", n: "Views" }, { k: "likes", n: "Likes" },
    { k: "saves", n: "Saves" }, { k: "saveRate", n: "Save rate" }, { k: "velocity", n: "Velocity" }, { k: "created", n: "Newest" }
  ];
  var PERIODS = [
    { k: "all", n: "All" }, { k: "7", n: "7d" }, { k: "28", n: "28d" },
    { k: "90", n: "90d" }, { k: "year", n: "This year" }, { k: "custom", n: "Custom" }
  ];

  var DOWNLOAD_PREFIX = "tiktok-creator-video-filter";

  return {
    FIELDS: FIELDS, STAT_CONTAINERS: STAT_CONTAINERS, STORAGE_KEYS: STORAGE_KEYS,
    DAY: DAY, SNAPSHOT_MIN_GAP: SNAPSHOT_MIN_GAP, SNAPSHOT_MAX: SNAPSHOT_MAX,
    BADGE: BADGE, TABS: TABS, SORTS: SORTS, PERIODS: PERIODS, DOWNLOAD_PREFIX: DOWNLOAD_PREFIX
  };
});
