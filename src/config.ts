import type { Site, SocialObjects } from "./types";

export const SITE: Site = {
  website: "https://s5nblog.site/", // replace this with your deployed domain
  author: "suo yuan",
  desc: "This's my blog. I'm learning computer science & internet of things.",
  title: "Suoyuan's Blog",
  ogImage: "astropaper-og.jpg",
  lightAndDarkMode: true,
  postPerPage: 6,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
};

export const LOCALE = {
  lang: "zh-cn", // html lang code. Set this empty and default will be "en"
  langTag: [], // BCP 47 Language Tags. Set this empty [] to use the environment default
} as const;

export const LOGO_IMAGE = {
  enable: false,
  svg: true,
  width: 216,
  height: 46,
};

export const SOCIALS: SocialObjects = [
  {
    name: "Github",
    href: "https://github.com/suoyuan666",
    linkTitle: ` ${SITE.title} on Github`,
    active: true,
  },
];
