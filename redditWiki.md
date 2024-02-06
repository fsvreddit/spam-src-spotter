# Spam Source Spotter

A moderation bot to report posts that are from domains that are not commonly used.

This app allows you to set two options.

### Act on sources that have been seen this many times or less

E.g. if this is set to 5, a post only gets reported if it is from a domain that has been used four times or fewer. Set this value to 1 if you want to only report posts from domains that have literally never been seen. If this value is set to zero, reporting is effectively turned off. You may find it useful to run the app with a threshold of zero for a week or two in order to allow the app to gather data.

### Template for report text

Allows you to specify a custom reporting message.

## Operation Notes

When the app is first installed, it analyses the first 1000 subreddit posts when sorted by "hot" and stores the number of times each has been used. This should reduce the number of spurious reports that would otherwise occur if every post was considered the "first time"!

After that point, the app will gather statistics on domains seen as posts are created, maintaining this data store.

If a post has been removed by a moderator or deleted by its author, it is not taken into account for future reports.

Checks are not currently run on posts while they are still in the moderation queue because it is not possible to report a queued post. This means that you may find you approve a post and then immediately get a report from the app.

