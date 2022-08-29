const { keyBy } = require("lodash");

module.exports = (activities, update) => {
    const newActivities = keyBy(JSON.parse(JSON.stringify(activities)), "id");
    update.forEach(command => {
        const { op, id, val } = command;
        if (op === 3) newActivities[`${val.id}`] = val;
        else if (op === 1) delete newActivities[`${id}`];
        else if (op === 2) {
            let index = newActivities[`${id}`].history.length - 1;
            if ("name" in val) newActivities[`${id}`].name = val.name;
            if ("history" in val && val.history.length > 0) {
                const times = val.history;
                const currentEntry = newActivities[`${id}`].history[index];
                if ("startDate" in currentEntry) {
                    newActivities[`${id}`].history[index].endDate = times.shift();
                    newActivities[`${id}`].history.push({});
                    index += 1;
                }
                times.forEach(time => {
                    const currentEntry = newActivities[`${id}`].history[index];
                    if ("startDate" in currentEntry) {
                        newActivities[`${id}`].history[index].endDate = time;
                        newActivities[`${id}`].history.push({});
                        index += 1;
                    }
                    else newActivities[`${id}`].history[index].startDate = time;
                });
            }
        }
    });
    return Object.values(newActivities);
};