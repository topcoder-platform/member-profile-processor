# member-profile-processor

### Description

This processor handles the Kafka messages that arise at the end of a marathon match.  If the MM is a rated
match, this processor kicks off API calls to the ratings calculation service (https://github.com/topcoder-platform/ratings-calculation-service)
to process the ratings updates for the marathon match results.

This processor listens to the `notifications.autopilot.events` Kafka topic and handles events with a payload with `phaseTypeName=review` and `state=end`

### Full flow

1. The autopilot has to raise an event to the notifications.autopilot.events Kafka topic with payload indicating the review has ended for the challenge, where `projectId` is the legacy ID for the challenge
```
{
	"topic": "notifications.autopilot.events",
	"originator": "Ghostar",
	"timestamp": "2024-03-29T01:03:15Z",
	"mime-type": "application/json",
	"payload": {
		"date": "2024-03-29T01:03:15Z",
		"projectId": 30373282,
		"phaseId": 1018098,
		"phaseTypeName": "Review",
		"state": "END",
		"operator": "151743"
	}
}
```

2. The member profile processor then goes through, finds all final submissions, and marks those members that submitted final submissions as attended in the `long_comp_result` table
3. The member profile processor then calls the ratings calculation service to calculate the ratings for the round using the round ID of the associated challenge
4. When the ratings calculation service is done calculating, it raises a Kafka event to `notification.rating.calculation` that is picked up by the member profile processor (this codebase)
5. The member profile processor calls out to the ratings service to load all coder data from Informix to the data warehouse (`/ratings/coders/load`), for the given round ID
6. Once the rating service finishes, it raises an event to `notification.rating.calculation`, picked up by the member profile processor
7. The member profile processor now calls the ratings service to load the ratings updates from Informix to the DW (`/ratings/mm/load`) for the given round ID
8. Once everything is in the DW, the nightly cron job on the `supply-data-migration` EC2 instance moves the data from the DW to DynamoDB.  
  * NOTE: This can be run manually by logging into that instance and running the 3 commands that are in the `crontab -l` for user `ec2-user`
9. A Lambda is fired when the DynamoDB tables are updated to move the data to ES, at which point it shows up in the member API
