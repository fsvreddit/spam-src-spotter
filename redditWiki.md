# Spam Source Spotter

A moderation bot to report posts that are from domains that are not commonly used.

This app allows you to set two options.

### Act on sources that have been seen this many times or less

E.g. if the threshold is zero, no posts will be reported.

If the threshold is 2, the first and second post that uses that domain will be reported, but no further ones.

### Template for report text

Allows you to specify a custom reporting message.

## Operation Notes

When the app is first installed, it analyses the first 1000 subreddit posts when sorted by "hot" and stores the number of times each has been used. This should reduce the number of spurious reports that would otherwise occur if every post was considered the "first time"!

After that point, the app will gather statistics on domains seen as posts are created, maintaining this data store.

If a post has been removed by a moderator or deleted by its author, it is not taken into account for future reports.

Checks are not currently run on posts while they are still in the moderation queue because it is not possible to report a queued post. This means that you may find you approve a post and then immediately get a report from the app.

