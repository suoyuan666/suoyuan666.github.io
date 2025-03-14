export const SITE = {
  website: "https://s5n.xyz/", // replace this with your deployed domain
  author: "Suo Yuan",
  profile: "",
  desc: "索元的博客",
  title: "SuoYuan's Blog",
  ogImage: "astropaper-og.jpg",
  lightAndDarkMode: true,
  postPerIndex: 6,
  postPerPage: 8,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
  showBackButton: true, // show back button in post detail
  editPost: {
    url: "https://github.com/suoyuan666/suoyuan666.github.io/edit/main/src/content/blog",
    text: "Suggest Changes",
    appendFilePath: true,
  },
  dynamicOgImage: true,
} as const;
