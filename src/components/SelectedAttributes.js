import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Text,
  Badge,
  VStack,
  HStack,
  IconButton,
} from '@chakra-ui/react';
import { FaTrash, FaQuestion } from 'react-icons/fa';

const SelectedAttributes = ({ selectedAttributes, checkboxTree, onDeleteType, onDeleteAttribute }) => {
    const [pendingDelete, setPendingDelete] = useState(null); // { type: 'group', id: typeId } or { type: 'attribute', typeId, attrId }
    const deleteButtonRef = useRef(null);

    // Handle click outside to reset pending delete
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (pendingDelete && deleteButtonRef.current && !deleteButtonRef.current.contains(event.target)) {
                setPendingDelete(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [pendingDelete]);

    if (!checkboxTree) return null;

    // Build a map of typeId to type name for display
    const typeMap = {};
    checkboxTree.forEach(type => {
        typeMap[type.typeId] = type;
    });

    // Count total selected
    const totalSelected = Object.values(selectedAttributes).reduce(
        (sum, set) => sum + set.size,
        0
    );

    // If nothing is selected, show message
    if (totalSelected === 0) {
        return (
            <Box p={3} bg="gray.50" borderRadius="md" textAlign="center">
                <Text fontSize="sm" color="gray.500">No attributes selected yet</Text>
            </Box>
        );
    }

    const handleDeleteClick = (deleteInfo) => {
        if (pendingDelete?.type === deleteInfo.type &&
            pendingDelete?.id === deleteInfo.id &&
            pendingDelete?.typeId === deleteInfo.typeId &&
            pendingDelete?.attrId === deleteInfo.attrId) {
            // Second click - confirm delete
            if (deleteInfo.type === 'group') {
                onDeleteType(deleteInfo.id);
            } else {
                onDeleteAttribute(deleteInfo.typeId, deleteInfo.attrId);
            }
            setPendingDelete(null);
        } else {
            // First click - set pending
            setPendingDelete(deleteInfo);
        }
    };

    const isDeletePending = (deleteInfo) => {
        return pendingDelete?.type === deleteInfo.type &&
               pendingDelete?.id === deleteInfo.id &&
               pendingDelete?.typeId === deleteInfo.typeId &&
               pendingDelete?.attrId === deleteInfo.attrId;
    };

    return (
        <VStack align="stretch" spacing={2}>
            {Object.entries(selectedAttributes).map(([typeId, attributeSet]) => {
                if (attributeSet.size === 0) return null;

                const type = typeMap[typeId];
                const selectedAttrs = type?.attributes?.filter(attr =>
                    attributeSet.has(attr.id)
                ) || [];

                const groupDeleteInfo = { type: 'group', id: typeId };
                const isPending = isDeletePending(groupDeleteInfo);

                return (
                    <Box
                        key={typeId}
                        p={2}
                        bg="white"
                        borderRadius="md"
                        border="1px solid"
                        borderColor="gray.200"
                    >
                        <HStack justify="space-between" mb={2}>
                            <Text fontSize="xs" fontWeight="bold" color="blue.700" isTruncated flex={1}>
                                {typeId}
                            </Text>
                            <Badge size="xs" colorPalette="blue">
                                {attributeSet.size}
                            </Badge>
                            <Box ref={isPending ? deleteButtonRef : null}>
                                <IconButton
                                    size="2xs"
                                    variant="ghost"
                                    color={isPending ? 'orange.600' : 'red.500'}
                                    _hover={{ bg: isPending ? 'orange.100' : 'red.50' }}
                                    onClick={() => handleDeleteClick(groupDeleteInfo)}
                                    aria-label={isPending ? 'Confirm delete group' : 'Delete group'}
                                >
                                    {isPending ? <FaQuestion size={10} /> : <FaTrash size={10} />}
                                </IconButton>
                            </Box>
                        </HStack>

                        <VStack align="stretch" spacing={1}>
                            {selectedAttrs.map(attr => {
                                const attrDeleteInfo = { type: 'attribute', typeId, attrId: attr.id };
                                const isAttrPending = isDeletePending(attrDeleteInfo);

                                return (
                                    <HStack
                                        key={attr.id}
                                        px={2}
                                        py={1}
                                        bg="gray.50"
                                        borderRadius="sm"
                                        justify="space-between"
                                    >
                                        <Text
                                            fontSize="xs"
                                            color="gray.800"
                                            isTruncated
                                            flex={1}
                                        >
                                            {attr.id}
                                        </Text>
                                        <Box ref={isAttrPending ? deleteButtonRef : null}>
                                            <IconButton
                                                size="2xs"
                                                variant="ghost"
                                                color={isAttrPending ? 'orange.600' : 'red.500'}
                                                _hover={{ bg: isAttrPending ? 'orange.100' : 'red.50' }}
                                                onClick={() => handleDeleteClick(attrDeleteInfo)}
                                                aria-label={isAttrPending ? 'Confirm delete attribute' : 'Delete attribute'}
                                            >
                                                {isAttrPending ? <FaQuestion size={9} /> : <FaTrash size={9} />}
                                            </IconButton>
                                        </Box>
                                    </HStack>
                                );
                            })}
                        </VStack>
                    </Box>
                );
            })}
        </VStack>
    );
};

export default SelectedAttributes;
