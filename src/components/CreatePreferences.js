import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Button,
    Card,
    Center,
    Heading,
    Input,
    Text,
    VStack,
    HStack,
    Badge,
    Accordion,
    IconButton,
    Grid,
    Checkbox,
    Dialog,
    Textarea,
    Spinner,
} from '@chakra-ui/react';
import { MdClose, MdEdit, MdAdd, MdUploadFile, MdInsertDriveFile } from 'react-icons/md';
import { parseString } from 'xml2js';
import ExportModal from './ExportModal';
import { generateXML } from '../utils/xmlGenerator';
import { buildCheckboxTree } from '../utils/xmlParser';
import { 
    saveCreateState, 
    getCreateState, 
    getCurrentFileId, 
    getFileFromHistory,
    saveFileToHistory,
    saveParsedData,
} from '../utils/db';

// Common SFCC system type-extension IDs
const COMMON_TYPE_IDS = [
    'SitePreferences',
    'Product',
    'Category',
    'Content',
    'Basket',
    'Order',
    'OrderLine',
    'Profile',
    'Customer',
    'ProductList',
    'GiftCertificate',
    'Coupon',
    'Campaign',
    'PriceBook',
    'Store',
    'Shipment',
];

// All valid SFCC custom attribute types from metadata.xsd
const ATTRIBUTE_TYPES = [
    { value: 'string', label: 'String', hasLength: true },
    { value: 'text', label: 'Text (long string)', hasLength: true },
    { value: 'html', label: 'HTML', hasLength: true },
    { value: 'int', label: 'Integer', hasMinMax: true },
    { value: 'double', label: 'Double (decimal)', hasMinMax: true, hasScale: true },
    { value: 'boolean', label: 'Boolean (true/false)' },
    { value: 'date', label: 'Date' },
    { value: 'datetime', label: 'Date & Time' },
    { value: 'email', label: 'Email', hasLength: true },
    { value: 'password', label: 'Password', hasLength: true },
    { value: 'image', label: 'Image' },
    { value: 'enum-of-string', label: 'Enum of String', hasEnum: true },
    { value: 'enum-of-int', label: 'Enum of Integer', hasEnum: true },
    { value: 'set-of-string', label: 'Set of String', hasEnum: true },
    { value: 'set-of-int', label: 'Set of Integer', hasEnum: true },
    { value: 'set-of-double', label: 'Set of Double', hasEnum: true },
];

// Converts internal CreatePreferences state → checkboxTree + selectedAttributes for export
const buildExportData = (typeExtensions) => {
    const checkboxTree = typeExtensions
        .filter((te) => te.typeId.trim())
        .map((te) => {
            const attributes = te.attributes
                .filter((a) => a.attributeId.trim())
                .map((a) => ({
                    // Spread first to include all metadata fields
                    ...a,
                    // Then override key fields to ensure correct export format
                    id: a.attributeId.trim(),
                    displayName: a.displayName,
                    type: a.type,
                }));

            // Derive groups from attribute assignments
            const groupMap = new Map(); // groupId -> { groupId, displayName, attributeIds }
            
            attributes.forEach((attr) => {
                if (attr.groups && attr.groups.length > 0) {
                    attr.groups.forEach((group) => {
                        if (!groupMap.has(group.groupId)) {
                            groupMap.set(group.groupId, {
                                groupId: group.groupId,
                                displayName: group.displayName || '',
                                attributeIds: group.originalAttributeIds ? [...group.originalAttributeIds] : [],
                            });
                        }
                        // Add current attribute if not already in the list
                        const groupData = groupMap.get(group.groupId);
                        if (!groupData.attributeIds.includes(attr.id)) {
                            groupData.attributeIds.push(attr.id);
                        }
                    });
                }
            });

            return {
                typeId: te.typeId.trim(),
                attributes,
                groups: Array.from(groupMap.values()),
            };
        })
        .filter((te) => te.attributes.length > 0);

    const selectedAttributes = {};
    checkboxTree.forEach((type) => {
        selectedAttributes[type.typeId] = new Set(type.attributes.map((a) => a.id));
    });

    return { checkboxTree, selectedAttributes };
};

const CreatePreferences = () => {
    const [typeExtensions, setTypeExtensions] = useState([]);
    const [selectedTypeId, setSelectedTypeId] = useState('');
    const [customTypeId, setCustomTypeId] = useState('');
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportType, setExportType] = useState('full');
    
    // Attribute editor modal state
    const [isAttrModalOpen, setIsAttrModalOpen] = useState(false);
    const [editingAttr, setEditingAttr] = useState(null); // { typeExtId, attr } or null
    const [attrForm, setAttrForm] = useState(getEmptyAttrForm());
    
    // Group suggestions from extract flow
    const [suggestedGroups, setSuggestedGroups] = useState([]); // Groups from extract flow
    
    // Reference file (shared with extract flow)
    const [referenceFileInfo, setReferenceFileInfo] = useState(null);
    const [isFileLoading, setIsFileLoading] = useState(false);
    const fileInputRef = useRef(null);
    
    // Group selector state
    const [groupSearchQuery, setGroupSearchQuery] = useState('');
    const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);

    // ── Helper: extract groups + attrs from a parsed tree ─────────────────────

    const applyTreeToSuggestions = (tree, fileInfo) => {
        const allGroups = [];
        tree.forEach((type) => {
            if (type.groups && type.groups.length > 0) {
                type.groups.forEach((group) => {
                    allGroups.push({
                        typeId: type.typeId,
                        groupId: group.groupId,
                        displayName: group.displayName,
                        attributeIds: group.attributeIds,
                    });
                });
            }
        });
        setSuggestedGroups(allGroups);
        setReferenceFileInfo(fileInfo || null);
    };

    // ── Load state from IndexedDB on mount ────────────────────────────────────

    useEffect(() => {
        const loadSavedState = async () => {
            try {
                const savedState = await getCreateState();
                if (savedState && Array.isArray(savedState) && savedState.length > 0) {
                    setTypeExtensions(savedState);
                    console.log('Loaded create flow state from IndexedDB:', savedState.length, 'type-extensions');
                }
            } catch (error) {
                console.error('Failed to load create flow state:', error);
            }
        };
        loadSavedState();
    }, []);
    
    // ── Close group dropdown on click outside ──────────────────────────────────
    
    useEffect(() => {
        const handleClickOutside = (e) => {
            // Check if click is outside the dropdown container
            const target = e.target;
            const dropdownContainer = target.closest('[data-group-dropdown]');
            if (!dropdownContainer && isGroupDropdownOpen) {
                setIsGroupDropdownOpen(false);
            }
        };
        
        if (isGroupDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isGroupDropdownOpen]);
    
    // ── Load suggested groups from extract flow's current file ────────────────

    useEffect(() => {
        const loadSuggestedGroups = async () => {
            try {
                const currentFileId = await getCurrentFileId();
                if (currentFileId) {
                    const fileData = await getFileFromHistory(currentFileId);
                    if (fileData?.tree) {
                        applyTreeToSuggestions(fileData.tree, fileData.fileInfo);
                        console.log('Loaded suggested groups from current file:', fileData.fileInfo?.name);
                    }
                }
            } catch (error) {
                console.error('Failed to load suggested groups:', error);
            }
        };
        loadSuggestedGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Save state to IndexedDB whenever typeExtensions changes ───────────────

    useEffect(() => {
        const saveState = async () => {
            try {
                await saveCreateState(typeExtensions);
            } catch (error) {
                console.error('Failed to save create flow state:', error);
            }
        };
        
        // Only save if there's actual data (avoid saving empty initial state)
        if (typeExtensions.length > 0) {
            saveState();
        }
    }, [typeExtensions]);

    // ── Helper: Empty attribute form ───────────────────────────────────────────

    function getEmptyAttrForm() {
        return {
            attributeId: '',
            displayName: '',
            description: '',
            type: 'string',
            mandatory: false,
            localizable: false,
            siteSpecific: false,
            visible: true,
            externallyManaged: false,
            minLength: '',
            maxLength: '',
            fieldHeight: '',
            minValue: '',
            maxValue: '',
            scale: '',
            regex: '',
            defaultValue: '',
            enumValues: [], // [{ value: '', display: '', isDefault: false }]
            groups: [], // [{ groupId: '', displayName: '' }]
        };
    }

    // ── Type-extension operations ──────────────────────────────────────────────

    const addTypeExtension = () => {
        const typeId = selectedTypeId === '__custom__' ? customTypeId.trim() : selectedTypeId;
        if (!typeId) return;
        
        // Check if already exists
        if (typeExtensions.some(te => te.typeId === typeId)) {
            alert(`Type-extension "${typeId}" already exists!`);
            return;
        }

        setTypeExtensions((prev) => [
            ...prev,
            { id: crypto.randomUUID(), typeId, attributes: [] },
        ]);
        setSelectedTypeId('');
        setCustomTypeId('');
    };

    const removeTypeExtension = (id) => {
        setTypeExtensions((prev) => prev.filter((te) => te.id !== id));
    };

    // ── Attribute operations ───────────────────────────────────────────────────

    const openAttrModal = (typeExtId, attr = null) => {
        setEditingAttr(attr ? { typeExtId, attr } : { typeExtId, attr: null });
        setAttrForm(attr ? { ...attr } : getEmptyAttrForm());
        setIsAttrModalOpen(true);
    };

    const closeAttrModal = () => {
        setIsAttrModalOpen(false);
        setEditingAttr(null);
        setAttrForm(getEmptyAttrForm());
    };

    const saveAttribute = () => {
        if (!attrForm.attributeId.trim()) {
            alert('Attribute ID is required');
            return;
        }

        const { typeExtId, attr } = editingAttr;

        setTypeExtensions((prev) =>
            prev.map((te) => {
                if (te.id !== typeExtId) return te;

                if (attr) {
                    // Edit existing
                    return {
                        ...te,
                        attributes: te.attributes.map((a) =>
                            a.id === attr.id ? { ...attrForm, id: attr.id } : a
                        ),
                    };
                } else {
                    // Add new
                    return {
                        ...te,
                        attributes: [...te.attributes, { ...attrForm, id: crypto.randomUUID() }],
                    };
                }
            })
        );

        closeAttrModal();
    };

    const removeAttribute = (typeExtId, attrId) => {
        setTypeExtensions((prev) =>
            prev.map((te) =>
                te.id === typeExtId
                    ? { ...te, attributes: te.attributes.filter((a) => a.id !== attrId) }
                    : te
            )
        );
    };

    const addEnumValue = () => {
        setAttrForm((prev) => ({
            ...prev,
            enumValues: [...prev.enumValues, { value: '', display: '', isDefault: false }],
        }));
    };

    const updateEnumValue = (index, field, value) => {
        setAttrForm((prev) => ({
            ...prev,
            enumValues: prev.enumValues.map((ev, i) =>
                i === index ? { ...ev, [field]: value } : ev
            ),
        }));
    };

    const removeEnumValue = (index) => {
        setAttrForm((prev) => ({
            ...prev,
            enumValues: prev.enumValues.filter((_, i) => i !== index),
        }));
    };

    // ── Group assignment operations (within attribute) ────────────────────────

    const assignGroupToAttribute = (groupId, displayName) => {
        setAttrForm((prev) => {
            const groups = prev.groups || [];
            
            // Check if already assigned
            if (groups.some((g) => g.groupId === groupId)) {
                return prev;
            }
            
            // Check if this is a suggested group from extract flow and preserve original attributeIds
            const suggestedGroup = suggestedGroups.find((sg) => sg.groupId === groupId);
            const originalAttributeIds = suggestedGroup ? suggestedGroup.attributeIds : [];
            
            return {
                ...prev,
                groups: [...groups, { 
                    groupId, 
                    displayName: displayName || '',
                    originalAttributeIds // Preserve original attrs from file for export
                }],
            };
        });
        
        // Clear search and close dropdown
        setGroupSearchQuery('');
        setIsGroupDropdownOpen(false);
    };

    const removeGroupFromAttribute = (groupId) => {
        setAttrForm((prev) => ({
            ...prev,
            groups: (prev.groups || []).filter((g) => g.groupId !== groupId),
        }));
    };
    
    // Get available groups for current type
    const getAvailableGroups = () => {
        if (!editingAttr) return [];
        
        const te = typeExtensions.find((t) => t.id === editingAttr.typeExtId);
        if (!te) return [];
        
        // Get suggested groups matching this type
        const matchingGroups = suggestedGroups
            .filter((sg) => sg.typeId === te.typeId)
            .map((sg) => ({ groupId: sg.groupId, displayName: sg.displayName, source: 'suggested' }));
        
        // Get groups already used in other attributes of this type
        const existingGroups = new Map();
        te.attributes.forEach((attr) => {
            if (attr.groups) {
                attr.groups.forEach((g) => {
                    if (!existingGroups.has(g.groupId)) {
                        existingGroups.set(g.groupId, { 
                            groupId: g.groupId, 
                            displayName: g.displayName,
                            source: 'existing'
                        });
                    }
                });
            }
        });
        
        // Combine and deduplicate
        const combinedMap = new Map();
        matchingGroups.forEach((g) => combinedMap.set(g.groupId, g));
        existingGroups.forEach((g) => {
            if (!combinedMap.has(g.groupId)) {
                combinedMap.set(g.groupId, g);
            }
        });
        
        return Array.from(combinedMap.values());
    };
    
    // Filter groups based on search query
    const getFilteredGroups = () => {
        const available = getAvailableGroups();
        const query = groupSearchQuery.trim().toLowerCase();
        
        if (!query) return available;
        
        return available.filter((g) => 
            g.groupId.toLowerCase().includes(query) || 
            (g.displayName && g.displayName.toLowerCase().includes(query))
        );
    };
    
    // Check if search query is a potential new group
    const canCreateNewGroup = () => {
        const query = groupSearchQuery.trim();
        if (!query) return false;
        
        // Check if already assigned
        if ((attrForm.groups || []).some((g) => g.groupId === query)) {
            return false;
        }
        
        // Check if matches existing
        const available = getAvailableGroups();
        const exactMatch = available.some((g) => g.groupId === query);
        
        return !exactMatch;
    };

    // ── Reference file upload (shared with extract flow) ──────────────────────

    const handleReferenceFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsFileLoading(true);
        const fileId = `${file.name}-${file.size}-${file.lastModified}`;
        const fileInfo = {
            name: file.name,
            size: file.size,
            lastModified: file.lastModified,
            uploadedAt: Date.now(),
        };

        const reader = new FileReader();
        reader.onload = (ev) => {
            parseString(ev.target.result, async (err, result) => {
                if (err) {
                    console.error('Error parsing XML:', err);
                    setIsFileLoading(false);
                    return;
                }
                const tree = buildCheckboxTree(result);
                const fileData = {
                    tree,
                    fileInfo,
                    fileState: { typeFilter: '', attributeFilter: '', selectedAttributes: {} },
                };
                // Save to shared file history (same store as extract flow)
                await saveFileToHistory(fileId, fileData);
                await saveParsedData(fileData); // backward compat
                applyTreeToSuggestions(tree, fileInfo);
                setIsFileLoading(false);
                // Reset input so the same file can be re-uploaded
                if (fileInputRef.current) fileInputRef.current.value = '';
            });
        };
        reader.onerror = () => setIsFileLoading(false);
        reader.readAsText(file);
    };

    // ── Export ─────────────────────────────────────────────────────────────────

    const hasExportableContent = typeExtensions.some(
        (te) => te.typeId.trim() && te.attributes.some((a) => a.attributeId.trim())
    );

    const openExport = (type) => {
        setExportType(type);
        setIsExportModalOpen(true);
    };

    const exportData = hasExportableContent ? buildExportData(typeExtensions) : null;

    const selectedTypeInfo = ATTRIBUTE_TYPES.find(t => t.value === attrForm.type) || {};

    // ── Clear all data ─────────────────────────────────────────────────────────

    const handleClearAll = async () => {
        if (typeExtensions.length === 0) return;
        
        const confirmed = window.confirm(
            `Are you sure you want to clear all ${typeExtensions.length} type-extension(s)?\n\nThis action cannot be undone.`
        );
        
        if (confirmed) {
            setTypeExtensions([]);
            try {
                const { clearCreateState } = await import('../utils/db');
                await clearCreateState();
                console.log('Cleared create flow state');
            } catch (error) {
                console.error('Failed to clear create flow state:', error);
            }
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <Box p={4}>
            {/* Page header */}
            <HStack justify="space-between" align="start" mb={4}>
                <Box>
                    <Heading size="lg" mb={1}>
                        Create from Scratch
                    </Heading>
                    <Text fontSize="sm" color="gray.500">
                        Define type-extensions and attributes, then export as SFCC metadata XML.
                    </Text>
                </Box>

                <HStack flexShrink={0} gap={2}>
                    {typeExtensions.length > 0 && (
                        <Button
                            size="sm"
                            variant="outline"
                            colorPalette="red"
                            onClick={handleClearAll}
                        >
                            Clear All
                        </Button>
                    )}
                    {hasExportableContent && (
                        <>
                            <Button
                                size="sm"
                                variant="outline"
                                colorPalette="blue"
                                onClick={() => openExport('partial')}
                            >
                                Partial XML
                            </Button>
                            <Button
                                size="sm"
                                colorPalette="blue"
                                onClick={() => openExport('full')}
                            >
                                Full XML
                            </Button>
                        </>
                    )}
                </HStack>
            </HStack>

            {/* Reference file — shared with Extract flow */}
            <Card.Root mb={4} variant="outline">
                <Card.Body p={3}>
                    {/* Hidden real file input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xml"
                        style={{ display: 'none' }}
                        onChange={handleReferenceFileUpload}
                    />
                    <HStack gap={3} align="center">
                        <Text fontSize="sm" fontWeight="medium" color="gray.600" flexShrink={0}>
                            Reference file:
                        </Text>

                        {referenceFileInfo ? (
                            <HStack flex={1} gap={2} overflow="hidden">
                                <MdInsertDriveFile style={{ color: 'var(--chakra-colors-blue-500)', flexShrink: 0 }} />
                                <Text fontSize="sm" fontWeight="medium" truncate flex={1}>
                                    {referenceFileInfo.name}
                                </Text>
                                <Badge colorPalette="purple" variant="subtle" fontSize="xs" flexShrink={0}>
                                    {suggestedGroups.length} groups
                                </Badge>
                            </HStack>
                        ) : (
                            <Text fontSize="sm" color="gray.400" flex={1}>
                                None — upload a metadata XML to load group suggestions
                            </Text>
                        )}

                        {isFileLoading ? (
                            <Spinner size="sm" color="blue.500" flexShrink={0} />
                        ) : (
                            <Button
                                size="sm"
                                variant="outline"
                                colorPalette="blue"
                                flexShrink={0}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <MdUploadFile />
                                {referenceFileInfo ? 'Change' : 'Upload'}
                            </Button>
                        )}
                    </HStack>
                </Card.Body>
            </Card.Root>

            {/* Add type-extension selector */}
            <Card.Root mb={4} variant="outline">
                <Card.Body p={3}>
                    <HStack gap={2}>
                        <select
                            value={selectedTypeId}
                            onChange={(e) => setSelectedTypeId(e.target.value)}
                            style={{
                                flex: 1,
                                height: '40px',
                                padding: '0 12px',
                                borderRadius: '6px',
                                border: '1px solid #e2e8f0',
                                fontSize: '14px',
                                backgroundColor: 'white',
                                cursor: 'pointer',
                                outline: 'none',
                            }}
                        >
                            <option value="">Select Type-Extension...</option>
                            {COMMON_TYPE_IDS.map((id) => (
                                <option key={id} value={id}>
                                    {id}
                                </option>
                            ))}
                            <option value="__custom__">Custom (enter below)...</option>
                        </select>

                        {selectedTypeId === '__custom__' && (
                            <Input
                                placeholder="Enter custom type ID..."
                                value={customTypeId}
                                onChange={(e) => setCustomTypeId(e.target.value)}
                                flex={1}
                            />
                        )}

                        <Button
                            colorPalette="green"
                            onClick={addTypeExtension}
                            disabled={
                                !selectedTypeId ||
                                (selectedTypeId === '__custom__' && !customTypeId.trim())
                            }
                            flexShrink={0}
                        >
                            <MdAdd /> Add
                        </Button>
                    </HStack>
                </Card.Body>
            </Card.Root>

            {/* Empty state */}
            {typeExtensions.length === 0 && (
                <Center
                    py={16}
                    borderRadius="lg"
                    border="2px dashed"
                    borderColor="gray.200"
                    bg="gray.50"
                >
                    <VStack gap={1}>
                        <Text fontSize="md" fontWeight="medium" color="gray.400">
                            No type-extensions yet
                        </Text>
                        <Text fontSize="sm" color="gray.400">
                            Select a type from the dropdown above
                        </Text>
                    </VStack>
                </Center>
            )}

            {/* Type-extensions list */}
            {typeExtensions.length > 0 && (
                <Accordion.Root collapsible lazyMount unmountOnExit>
                    {typeExtensions.map((te) => (
                        <Accordion.Item
                            key={te.id}
                            value={te.id}
                            border="1px solid"
                            borderColor="gray.200"
                            borderRadius="md"
                            mb={2}
                            bg="white"
                        >
                            <h2>
                                <Accordion.ItemTrigger
                                    _expanded={{ bg: 'green.50', color: 'green.700' }}
                                    py={2}
                                    px={3}
                                >
                                    <Box flex="1" textAlign="left" fontWeight="bold">
                                        {te.typeId}
                                    </Box>

                                    <Badge colorPalette="gray" mr={2} variant="subtle">
                                        {te.attributes.length}{' '}
                                        {te.attributes.length === 1 ? 'attr' : 'attrs'}
                                    </Badge>
                                    
                                    {(() => {
                                        // Calculate unique groups from attribute assignments
                                        const groupSet = new Set();
                                        te.attributes.forEach((attr) => {
                                            if (attr.groups) {
                                                attr.groups.forEach((g) => groupSet.add(g.groupId));
                                            }
                                        });
                                        const groupCount = groupSet.size;
                                        
                                        return groupCount > 0 ? (
                                            <Badge colorPalette="purple" mr={2} variant="subtle">
                                                {groupCount}{' '}
                                                {groupCount === 1 ? 'group' : 'groups'}
                                            </Badge>
                                        ) : null;
                                    })()}

                                    <Box
                                        as="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeTypeExtension(te.id);
                                        }}
                                        color="red.400"
                                        _hover={{ color: 'red.600' }}
                                        fontSize="xs"
                                        fontWeight="normal"
                                        cursor="pointer"
                                        px={1}
                                        mr={2}
                                    >
                                        Remove
                                    </Box>

                                    <Accordion.ItemIndicator />
                                </Accordion.ItemTrigger>
                            </h2>

                            <Accordion.ItemContent p={3}>
                                {/* Attribute list */}
                                <VStack align="stretch" gap={2} mb={3}>
                                    {te.attributes.map((attr) => (
                                        <Card.Root key={attr.id} variant="outline" size="sm">
                                            <Card.Body p={2}>
                                                <HStack justify="space-between">
                                                    <Box flex={1}>
                                                        <Text fontWeight="bold" fontSize="sm">
                                                            {attr.attributeId || '(untitled)'}
                                                        </Text>
                                                        <HStack gap={2} mt={1}>
                                                            <Badge size="xs" colorPalette="blue">
                                                                {attr.type}
                                                            </Badge>
                                                            {attr.displayName && (
                                                                <Text fontSize="xs" color="gray.500">
                                                                    {attr.displayName}
                                                                </Text>
                                                            )}
                                                            {attr.mandatory && (
                                                                <Badge size="xs" colorPalette="red">
                                                                    required
                                                                </Badge>
                                                            )}
                                                            {attr.groups && attr.groups.length > 0 && (
                                                                <Badge size="xs" colorPalette="purple" variant="subtle">
                                                                    {attr.groups.length} {attr.groups.length === 1 ? 'group' : 'groups'}
                                                                </Badge>
                                                            )}
                                                        </HStack>
                                                    </Box>
                                                    <HStack>
                                                        <IconButton
                                                            size="xs"
                                                            variant="ghost"
                                                            colorPalette="blue"
                                                            onClick={() => openAttrModal(te.id, attr)}
                                                            aria-label="Edit attribute"
                                                        >
                                                            <MdEdit />
                                                        </IconButton>
                                                        <IconButton
                                                            size="xs"
                                                            variant="ghost"
                                                            colorPalette="red"
                                                            onClick={() => removeAttribute(te.id, attr.id)}
                                                            aria-label="Remove attribute"
                                                        >
                                                            <MdClose />
                                                        </IconButton>
                                                    </HStack>
                                                </HStack>
                                            </Card.Body>
                                        </Card.Root>
                                    ))}
                                </VStack>

                                <Button
                                    size="sm"
                                    variant="outline"
                                    colorPalette="green"
                                    onClick={() => openAttrModal(te.id)}
                                >
                                    <MdAdd /> Add Attribute
                                </Button>
                            </Accordion.ItemContent>
                        </Accordion.Item>
                    ))}
                </Accordion.Root>
            )}

            {/* Attribute Editor Modal */}
            <Dialog.Root
                open={isAttrModalOpen}
                onOpenChange={(e) => !e.open && closeAttrModal()}
                size="xl"
            >
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content maxH="90vh" overflow="hidden" display="flex" flexDirection="column">
                        <Dialog.Header>
                            <Dialog.Title>
                                {editingAttr?.attr ? 'Edit Attribute' : 'Create Attribute'}
                            </Dialog.Title>
                            <Dialog.CloseTrigger />
                        </Dialog.Header>
                        <Dialog.Body overflow="auto" p={4}>
                            <VStack align="stretch" gap={4}>
                                {/* Basic fields */}
                                <Box>
                                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                                        Attribute ID *
                                    </Text>
                                    <Input
                                        value={attrForm.attributeId}
                                        onChange={(e) =>
                                            setAttrForm({ ...attrForm, attributeId: e.target.value })
                                        }
                                        placeholder="my-custom-attribute"
                                    />
                                </Box>

                                <Box>
                                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                                        Display Name
                                    </Text>
                                    <Input
                                        value={attrForm.displayName}
                                        onChange={(e) =>
                                            setAttrForm({ ...attrForm, displayName: e.target.value })
                                        }
                                        placeholder="My Custom Attribute"
                                    />
                                </Box>

                                <Box>
                                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                                        Description
                                    </Text>
                                    <Textarea
                                        value={attrForm.description}
                                        onChange={(e) =>
                                            setAttrForm({ ...attrForm, description: e.target.value })
                                        }
                                        placeholder="Optional description..."
                                        rows={2}
                                    />
                                </Box>

                                <Box>
                                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                                        Type *
                                    </Text>
                                    <select
                                        value={attrForm.type}
                                        onChange={(e) =>
                                            setAttrForm({ ...attrForm, type: e.target.value })
                                        }
                                        style={{
                                            width: '100%',
                                            height: '40px',
                                            padding: '0 12px',
                                            borderRadius: '6px',
                                            border: '1px solid #e2e8f0',
                                            fontSize: '14px',
                                            backgroundColor: 'white',
                                        }}
                                    >
                                        {ATTRIBUTE_TYPES.map((t) => (
                                            <option key={t.value} value={t.value}>
                                                {t.label}
                                            </option>
                                        ))}
                                    </select>
                                </Box>

                                {/* Flags */}
                                <Box>
                                    <Text fontSize="sm" fontWeight="medium" mb={2}>
                                        Flags
                                    </Text>
                                    <Grid templateColumns="repeat(2, 1fr)" gap={2}>
                                        <Checkbox.Root
                                            checked={attrForm.mandatory}
                                            onCheckedChange={(e) =>
                                                setAttrForm({ ...attrForm, mandatory: e.checked })
                                            }
                                        >
                                            <Checkbox.HiddenInput />
                                            <Checkbox.Control>
                                                <Checkbox.Indicator />
                                            </Checkbox.Control>
                                            <Checkbox.Label>Mandatory</Checkbox.Label>
                                        </Checkbox.Root>

                                        <Checkbox.Root
                                            checked={attrForm.visible}
                                            onCheckedChange={(e) =>
                                                setAttrForm({ ...attrForm, visible: e.checked })
                                            }
                                        >
                                            <Checkbox.HiddenInput />
                                            <Checkbox.Control>
                                                <Checkbox.Indicator />
                                            </Checkbox.Control>
                                            <Checkbox.Label>Visible</Checkbox.Label>
                                        </Checkbox.Root>

                                        <Checkbox.Root
                                            checked={attrForm.localizable}
                                            onCheckedChange={(e) =>
                                                setAttrForm({ ...attrForm, localizable: e.checked })
                                            }
                                        >
                                            <Checkbox.HiddenInput />
                                            <Checkbox.Control>
                                                <Checkbox.Indicator />
                                            </Checkbox.Control>
                                            <Checkbox.Label>Localizable</Checkbox.Label>
                                        </Checkbox.Root>

                                        <Checkbox.Root
                                            checked={attrForm.siteSpecific}
                                            onCheckedChange={(e) =>
                                                setAttrForm({ ...attrForm, siteSpecific: e.checked })
                                            }
                                        >
                                            <Checkbox.HiddenInput />
                                            <Checkbox.Control>
                                                <Checkbox.Indicator />
                                            </Checkbox.Control>
                                            <Checkbox.Label>Site-Specific</Checkbox.Label>
                                        </Checkbox.Root>

                                        <Checkbox.Root
                                            checked={attrForm.externallyManaged}
                                            onCheckedChange={(e) =>
                                                setAttrForm({
                                                    ...attrForm,
                                                    externallyManaged: e.checked,
                                                })
                                            }
                                        >
                                            <Checkbox.HiddenInput />
                                            <Checkbox.Control>
                                                <Checkbox.Indicator />
                                            </Checkbox.Control>
                                            <Checkbox.Label>Externally Managed</Checkbox.Label>
                                        </Checkbox.Root>
                                    </Grid>
                                </Box>

                                {/* Conditional fields based on type */}
                                {(selectedTypeInfo.hasLength || selectedTypeInfo.hasMinMax || selectedTypeInfo.hasScale) && (
                                    <Box>
                                        <Text fontSize="sm" fontWeight="medium" mb={2}>
                                            Validation
                                        </Text>
                                        <Grid templateColumns="repeat(3, 1fr)" gap={2}>
                                            {selectedTypeInfo.hasLength && (
                                                <>
                                                    <Box>
                                                        <Text fontSize="xs" color="gray.500" mb={1}>
                                                            Min Length
                                                        </Text>
                                                        <Input
                                                            size="sm"
                                                            type="number"
                                                            value={attrForm.minLength}
                                                            onChange={(e) =>
                                                                setAttrForm({
                                                                    ...attrForm,
                                                                    minLength: e.target.value,
                                                                })
                                                            }
                                                        />
                                                    </Box>
                                                    <Box>
                                                        <Text fontSize="xs" color="gray.500" mb={1}>
                                                            Max Length
                                                        </Text>
                                                        <Input
                                                            size="sm"
                                                            type="number"
                                                            value={attrForm.maxLength}
                                                            onChange={(e) =>
                                                                setAttrForm({
                                                                    ...attrForm,
                                                                    maxLength: e.target.value,
                                                                })
                                                            }
                                                        />
                                                    </Box>
                                                </>
                                            )}
                                            {selectedTypeInfo.hasMinMax && (
                                                <>
                                                    <Box>
                                                        <Text fontSize="xs" color="gray.500" mb={1}>
                                                            Min Value
                                                        </Text>
                                                        <Input
                                                            size="sm"
                                                            type="number"
                                                            value={attrForm.minValue}
                                                            onChange={(e) =>
                                                                setAttrForm({
                                                                    ...attrForm,
                                                                    minValue: e.target.value,
                                                                })
                                                            }
                                                        />
                                                    </Box>
                                                    <Box>
                                                        <Text fontSize="xs" color="gray.500" mb={1}>
                                                            Max Value
                                                        </Text>
                                                        <Input
                                                            size="sm"
                                                            type="number"
                                                            value={attrForm.maxValue}
                                                            onChange={(e) =>
                                                                setAttrForm({
                                                                    ...attrForm,
                                                                    maxValue: e.target.value,
                                                                })
                                                            }
                                                        />
                                                    </Box>
                                                </>
                                            )}
                                            {selectedTypeInfo.hasScale && (
                                                <Box>
                                                    <Text fontSize="xs" color="gray.500" mb={1}>
                                                        Decimal Scale
                                                    </Text>
                                                    <Input
                                                        size="sm"
                                                        type="number"
                                                        value={attrForm.scale}
                                                        onChange={(e) =>
                                                            setAttrForm({
                                                                ...attrForm,
                                                                scale: e.target.value,
                                                            })
                                                        }
                                                    />
                                                </Box>
                                            )}
                                        </Grid>
                                    </Box>
                                )}

                                {/* Enum values */}
                                {selectedTypeInfo.hasEnum && (
                                    <Box>
                                        <HStack justify="space-between" mb={2}>
                                            <Text fontSize="sm" fontWeight="medium">
                                                Enum Values
                                            </Text>
                                            <Button size="xs" onClick={addEnumValue}>
                                                <MdAdd /> Add Value
                                            </Button>
                                        </HStack>
                                        <VStack align="stretch" gap={2}>
                                            {attrForm.enumValues.map((ev, i) => (
                                                <HStack key={i} gap={2}>
                                                    <Input
                                                        size="sm"
                                                        placeholder="value"
                                                        value={ev.value}
                                                        onChange={(e) =>
                                                            updateEnumValue(i, 'value', e.target.value)
                                                        }
                                                    />
                                                    <Input
                                                        size="sm"
                                                        placeholder="Display"
                                                        value={ev.display}
                                                        onChange={(e) =>
                                                            updateEnumValue(i, 'display', e.target.value)
                                                        }
                                                    />
                                                    <Checkbox.Root
                                                        checked={ev.isDefault}
                                                        onCheckedChange={(e) =>
                                                            updateEnumValue(i, 'isDefault', e.checked)
                                                        }
                                                    >
                                                        <Checkbox.HiddenInput />
                                                        <Checkbox.Control>
                                                            <Checkbox.Indicator />
                                                        </Checkbox.Control>
                                                        <Checkbox.Label fontSize="xs">
                                                            Default
                                                        </Checkbox.Label>
                                                    </Checkbox.Root>
                                                    <IconButton
                                                        size="xs"
                                                        variant="ghost"
                                                        colorPalette="red"
                                                        onClick={() => removeEnumValue(i)}
                                                        aria-label="Remove"
                                                    >
                                                        <MdClose />
                                                    </IconButton>
                                                </HStack>
                                            ))}
                                        </VStack>
                                    </Box>
                                )}

                                {/* Default value */}
                                <Box>
                                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                                        Default Value
                                    </Text>
                                    <Input
                                        value={attrForm.defaultValue}
                                        onChange={(e) =>
                                            setAttrForm({ ...attrForm, defaultValue: e.target.value })
                                        }
                                        placeholder="Optional default value..."
                                    />
                                </Box>

                                {/* Groups Assignment - Compact Searchable Dropdown */}
                                <Box pt={4} borderTop="1px solid" borderColor="gray.200">
                                    <Text fontSize="sm" fontWeight="medium" mb={2}>
                                        Groups
                                    </Text>

                                    {/* Assigned groups - compact badges */}
                                    {attrForm.groups && attrForm.groups.length > 0 && (
                                        <Box mb={2}>
                                            <HStack gap={1} flexWrap="wrap">
                                                {attrForm.groups.map((group, idx) => (
                                                    <Badge
                                                        key={idx}
                                                        colorPalette="purple"
                                                        variant="solid"
                                                        display="inline-flex"
                                                        alignItems="center"
                                                        gap={1}
                                                        py={1}
                                                        px={2}
                                                        fontSize="xs"
                                                    >
                                                        <Text as="span">
                                                            {group.displayName ? (
                                                                <>
                                                                    {group.displayName}{' '}
                                                                    <Text as="span" opacity={0.7}>
                                                                        ({group.groupId})
                                                                    </Text>
                                                                </>
                                                            ) : (
                                                                group.groupId
                                                            )}
                                                        </Text>
                                                        <Box
                                                            as="button"
                                                            onClick={() => removeGroupFromAttribute(group.groupId)}
                                                            ml={1}
                                                            _hover={{ opacity: 0.7 }}
                                                            aria-label="Remove from group"
                                                        >
                                                            <MdClose size={12} />
                                                        </Box>
                                                    </Badge>
                                                ))}
                                            </HStack>
                                        </Box>
                                    )}

                                    {/* Searchable dropdown */}
                                    <Box position="relative" data-group-dropdown>
                                        <Input
                                            size="sm"
                                            placeholder="Search or create group..."
                                            value={groupSearchQuery}
                                            onChange={(e) => {
                                                setGroupSearchQuery(e.target.value);
                                                if (!isGroupDropdownOpen) setIsGroupDropdownOpen(true);
                                            }}
                                            onFocus={() => setIsGroupDropdownOpen(true)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Escape') {
                                                    setIsGroupDropdownOpen(false);
                                                } else if (e.key === 'Enter' && canCreateNewGroup()) {
                                                    assignGroupToAttribute(groupSearchQuery.trim(), '');
                                                    e.preventDefault();
                                                }
                                            }}
                                        />

                                        {/* Dropdown results - positioned above input */}
                                        {isGroupDropdownOpen && (
                                            <Box
                                                position="absolute"
                                                bottom="100%"
                                                left={0}
                                                right={0}
                                                mb={1}
                                                bg="white"
                                                border="1px solid"
                                                borderColor="gray.200"
                                                borderRadius="md"
                                                boxShadow="lg"
                                                maxH="200px"
                                                overflow="auto"
                                                zIndex={1000}
                                            >
                                                {(() => {
                                                    const filteredGroups = getFilteredGroups();
                                                    const showCreateNew = canCreateNewGroup();
                                                    
                                                    if (filteredGroups.length === 0 && !showCreateNew) {
                                                        return (
                                                            <Box p={2} textAlign="center" fontSize="xs" color="gray.400">
                                                                {groupSearchQuery ? 'No groups found' : 'Type to search or create...'}
                                                            </Box>
                                                        );
                                                    }
                                                    
                                                    return (
                                                        <>
                                                            {filteredGroups.map((group, idx) => {
                                                                const isAssigned = (attrForm.groups || []).some(
                                                                    (g) => g.groupId === group.groupId
                                                                );
                                                                
                                                                return (
                                                                    <Box
                                                                        key={idx}
                                                                        p={2}
                                                                        cursor={isAssigned ? 'default' : 'pointer'}
                                                                        opacity={isAssigned ? 0.5 : 1}
                                                                        _hover={isAssigned ? {} : { bg: 'purple.50' }}
                                                                        onClick={() => {
                                                                            if (!isAssigned) {
                                                                                assignGroupToAttribute(group.groupId, group.displayName);
                                                                            }
                                                                        }}
                                                                        borderBottom="1px solid"
                                                                        borderColor="gray.100"
                                                                    >
                                                                        <HStack justify="space-between">
                                                                            <Box flex={1}>
                                                                                <Text fontSize="xs" fontWeight="medium">
                                                                                    {group.displayName ? (
                                                                                        <>
                                                                                            {group.displayName}{' '}
                                                                                            <Text as="span" color="gray.500" fontWeight="normal">
                                                                                                ({group.groupId})
                                                                                            </Text>
                                                                                        </>
                                                                                    ) : (
                                                                                        group.groupId
                                                                                    )}
                                                                                </Text>
                                                                            </Box>
                                                                            <HStack gap={1}>
                                                                                {group.source === 'suggested' && (
                                                                                    <Badge size="xs" colorPalette="blue" variant="subtle">
                                                                                        from file
                                                                                    </Badge>
                                                                                )}
                                                                                {isAssigned && (
                                                                                    <Badge size="xs" colorPalette="green" variant="subtle">
                                                                                        ✓
                                                                                    </Badge>
                                                                                )}
                                                                            </HStack>
                                                                        </HStack>
                                                                    </Box>
                                                                );
                                                            })}
                                                            
                                                            {/* Create new group option */}
                                                            {showCreateNew && (
                                                                <Box
                                                                    p={2}
                                                                    cursor="pointer"
                                                                    bg="green.50"
                                                                    _hover={{ bg: 'green.100' }}
                                                                    onClick={() => assignGroupToAttribute(groupSearchQuery.trim(), '')}
                                                                    borderTop={filteredGroups.length > 0 ? '2px solid' : undefined}
                                                                    borderColor="gray.200"
                                                                >
                                                                    <HStack>
                                                                        <MdAdd />
                                                                        <Box>
                                                                            <Text fontSize="xs" fontWeight="medium" color="green.700">
                                                                                Create "{groupSearchQuery.trim()}"
                                                                            </Text>
                                                                            <Text fontSize="xs" color="gray.500">
                                                                                Press Enter or click to create
                                                                            </Text>
                                                                        </Box>
                                                                    </HStack>
                                                                </Box>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </Box>
                                        )}
                                    </Box>
                                    
                                    <Text fontSize="xs" color="gray.500" mt={1}>
                                        Type to search existing groups or create new ones
                                    </Text>
                                </Box>
                            </VStack>
                        </Dialog.Body>
                        <Box p={4} borderTop="1px solid" borderColor="gray.200">
                            <HStack justify="flex-end" gap={2}>
                                <Button variant="outline" onClick={closeAttrModal}>
                                    Cancel
                                </Button>
                                <Button colorPalette="green" onClick={saveAttribute}>
                                    {editingAttr?.attr ? 'Save Changes' : 'Create Attribute'}
                                </Button>
                            </HStack>
                        </Box>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Dialog.Root>

            {/* Export modal — only mounted when there's exportable content */}
            {exportData && (
                <ExportModal
                    isOpen={isExportModalOpen}
                    onClose={() => setIsExportModalOpen(false)}
                    snippet={generateXML(
                        exportData.checkboxTree,
                        exportData.selectedAttributes,
                        exportType === 'partial'
                    )}
                    exportType={exportType}
                    selectedAttributes={exportData.selectedAttributes}
                    checkboxTree={exportData.checkboxTree}
                />
            )}
        </Box>
    );
};

export default CreatePreferences;

