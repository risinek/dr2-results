Periodically fetch the latest active event results from DiRT Rally 2.0 Club and if there was a change, post them to a discord channel in form of ASCII table.

add `.env` file like this:
```
DIRT_USERNAME=<codemasters account>
DIRT_PASSWORD=<codemasters account>
CLUB_ID=<can be found in chrome tools>
INTERVAL=<how often should fetch event results in ms>
DC_WEBHOOK=<discord webhook url>
```
The API is taken and slightly adjusted from https://github.com/tkidman/rally-round
