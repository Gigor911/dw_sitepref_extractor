// Test to verify group export logic
const { generateXML } = require('./xmlGenerator');

// Mock data structure matching what we parse
const checkboxTree = [
    {
        typeId: 'Basket',
        attributes: [
            { id: 'isRaffle', displayName: 'Is Raffle', type: 'boolean' },
            { id: 'orderSubtotalMinusTip', displayName: 'Order Subtotal Minus Tip', type: 'number' },
            { id: 'sddTipAmount', displayName: 'SDD Tip Amount', type: 'number' },
            { id: 'someOtherAttr', displayName: 'Some Other', type: 'string' }
        ],
        groups: [
            {
                groupId: 'Raffle',
                displayName: 'Raffle basket attributes',
                attributeIds: ['isRaffle']
            },
            {
                groupId: 'SDD',
                displayName: 'Same Day Delivery',
                attributeIds: ['orderSubtotalMinusTip', 'sddTipAmount']
            },
            {
                groupId: 'EmptyGroup',
                displayName: 'Empty Group',
                attributeIds: ['nonExistentAttr']
            }
        ]
    }
];

// Selected attributes - only select attributes from some groups
const selectedAttributes = {
    'Basket': new Set(['isRaffle', 'orderSubtotalMinusTip'])
};

// Generate XML
const xml = generateXML(checkboxTree, selectedAttributes, true);

console.log('Generated XML:');
console.log(xml);
console.log('\n---\nChecking for group-definitions...');
console.log('Has group-definitions:', xml.includes('<group-definitions>'));
console.log('Has Raffle group:', xml.includes('group-id="Raffle"'));
console.log('Has SDD group:', xml.includes('group-id="SDD"'));
console.log('Has EmptyGroup (should be false):', xml.includes('group-id="EmptyGroup"'));
