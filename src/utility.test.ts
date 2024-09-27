import {domainFromUrlString} from "./utility.js";

test("URL with www", () => {
    const url = "https://www.reddit.com/r/mod/about/modqueue";
    const domain = domainFromUrlString(url);
    expect(domain).toEqual("reddit.com");
});

test("URL without www", () => {
    const url = "https://redd.it/1aewabs";
    const domain = domainFromUrlString(url);
    expect(domain).toEqual("redd.it");
});
