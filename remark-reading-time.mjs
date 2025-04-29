import getReadingTime from 'reading-time';
import { toString as mdastToString } from 'mdast-util-to-string';

export function remarkReadingTime() {
  return (tree, { data }) => {
    const textOnPage = mdastToString(tree);
    const readingTime = getReadingTime(textOnPage);
    // readingTime.text 会给我们一个友好的字符串，例如 "3 min read"
    data.astro.frontmatter.minutesRead = readingTime.text;
  };
}
