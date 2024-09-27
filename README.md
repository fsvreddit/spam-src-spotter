A moderation bot to report posts that are from domains that are not commonly used. On many subreddits, most posts originate from a relatively predictable list of domains, and if a domain is posted that has never been seen before it can be an indication of spam activity.

![Example report](https://raw.githubusercontent.com/fsvreddit/spam-src-spotter/main/doc_images/screenshot.png)

This app allows you to set three options.

### Act on sources that have been seen this many times or less

E.g. if the threshold is zero, no posts will be reported. Some subs might find it useful to run with this setting for a week or two after install to help build up a store of domains that the sub sees (although the app does attempt to build a list on install - see the Operation Notes section).

If the threshold is 2, the first and second post that uses that domain will be reported, but no further ones.

### Check posts after approving out of the modqueue

If enabled, posts will be checked both when they are submitted (if they get past Automod or Reddit filters like Crowd Control) and when filtered posts get approved out of the modqueue.

If disabled, posts will only be checked if they get past Automod/Reddit filters.

### Template for report text

Allows you to specify a custom reporting message. Placeholders {{domain}} and {{usecount}} are supported.

## Operation Notes

When the app is first installed, it analyses the first 1000 subreddit posts when sorted by "hot" and stores the number of times each has been used. This should reduce the number of spurious reports that would otherwise occur if every post was considered the "first time"!

After that point, the app will gather statistics on domains seen as posts are created or approved out of the modqueue, maintaining this data store.

If a post has been removed by a moderator or deleted by its author, it is not taken into account for future reports.

Checks are not currently run on posts while they are still in the moderation queue because it is not possible to report a queued post. This means that you may find you approve a post and then immediately get a report from the app unless you turn off that option.

## Source Code

Spam Source Spotter is open source. You can find the source code on Github [here](https://github.com/fsvreddit/spam-src-spotter).

## Change History

v1.0.3: Fixed an error that prevented scores from being decremented is a user deletes their own post.
