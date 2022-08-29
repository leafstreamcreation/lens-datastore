const mergeUpdate = require("../src/routes/middleware/mergeUpdate");

const { ERRORMSG } = require("../src/errors");

describe("Spec for parsing updates from clients", () => {
  
    test("create", () => {
        const startDate = new Date(Date.now()).toLocaleDateString(); 
        const emptyData = { activities: [], tagSets: [] };
        const initialActivity = { 
            id: 1,
            name: "sleep",
            startDate: startDate,
            duration: 300000,
            tags: [
                { name: "interrupted", value: 1, desc: null }
            ],
            description: "Woke up early for the puppy"
        };
        const notEmptyData = { activities: [ initialActivity ], tagSets: [] };
        const val1 = { 
            id: 3,
            name: "eat",
            startDate: startDate,
            duration: 20000,
            tags: [],
            description: "beef stew"
        };
        const val2 = { 
            id: 2,
            name: "fuck",
            startDate: startDate,
            duration: 200000,
            tags: [
                { name: "funneling", value: null, desc: null }
            ],
            description: null
        };
        const command = [
            { op: 3, val: val1 },
            { op: 3, val: val2 }
        ];

        const createEmpty = mergeUpdate(emptyData, command);
        expect(createEmpty).toEqual({ activities: [val1, val2], tagSets: [] });
        const createNotEmpty = mergeUpdate(notEmptyData, command);
        expect(createNotEmpty).toEqual({ activities: [initialActivity, val1, val2], tagSets: [] });
    });
  
//     test("delete", () => {
//         const data = [
//             { id: 1 },
//             { id: 2 },
//             { id: 3 },
//         ];
//         const command = [
//             { op: 1, id: 3 },
//             { op: 1, id: 1 }
//         ];

//         const deletedData = mergeUpdate(data, command);
//         expect(deletedData).toEqual([
//             { id: 2 },
//         ]);
//     });
  
//     test("update", () => {
//         const data = [
//             { id: 1, name: "sleep", tags: [] },
//             { id: 2, name: "eat", tags: [] },
//             { id: 3, name: "fuck", tags: [{ name: "short",  }] },
//         ];
//         const command = [
//             { op: 2, id: 3, val: { name: "fuuuuck", tags: [1,2,3,4,5] } },
//             { op: 2, id: 1, val: { name: "snooze" } },
//             { op: 2, id: 2, val: { tags: [1,2,3,4,5] } }
//         ];

//         const updatedData = mergeUpdate(data, command);
//         expect(updatedData).toEqual([
//             { id: 1, name: "snooze", tags: [{}] },
//             { id: 2, name: "eat", tags: [
//                 { startDate: 1, endDate: 2 },
//                 { startDate: 3, endDate: 4 },
//                 { startDate: 5 }
//             ], group: 0 },
//             { id: 3, name: "fuuuuck", tags: [
//                 { startDate: 6, endDate: 1 },
//                 { startDate: 2, endDate: 3 },
//                 { startDate: 4, endDate: 5 },
//                 {}
//             ], group: 0 }
//         ]);
//     });
// });