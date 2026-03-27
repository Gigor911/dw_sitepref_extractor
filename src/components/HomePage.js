import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    Card,
    Center,
    Grid,
    GridItem,
    Heading,
    Text,
    VStack,
    HStack,
    Badge,
} from '@chakra-ui/react';
import { MdUploadFile, MdCreate } from 'react-icons/md';

const FLOWS = [
    {
        key: 'extract',
        path: '/extract',
        icon: MdUploadFile,
        title: 'Extract from XML',
        description:
            'Parse an existing SFCC metadata XML file. Browse type-extensions, filter by attribute ID, select exactly what you need, and export a clean XML snippet.',
        features: [
            'Upload any SFCC metadata XML',
            'Filter by type or attribute ID',
            'Export full or partial XML',
            'File history — switch between files',
        ],
        buttonLabel: 'Open Extractor',
        colorPalette: 'blue',
        badge: null,
    },
    {
        key: 'create',
        path: '/create',
        icon: MdCreate,
        title: 'Create from Scratch',
        description:
            'Build new custom site preferences interactively. Define type-extensions, configure attribute definitions with SFCC types, and export ready-to-import metadata XML. Optionally load a reference file to reuse existing groups.',
        features: [
            'Add type-extensions & attributes',
            'Choose from all SFCC attribute types',
            'Upload a reference XML to reuse groups',
            'Export full or partial XML',
            'Auto-saved — resume where you left off',
        ],
        buttonLabel: 'Start Creating',
        colorPalette: 'green',
        badge: 'New',
    },
];

const FlowCard = ({ flow, onClick }) => {
    const { icon: Icon, title, description, features, buttonLabel, colorPalette, badge } = flow;

    return (
        <Card.Root
            variant="outline"
            h="full"
            cursor="pointer"
            onClick={onClick}
            _hover={{
                boxShadow: 'xl',
                transform: 'translateY(-4px)',
                borderColor: `${colorPalette}.300`,
            }}
            transition="all 0.2s ease"
        >
            <Card.Body p={8}>
                <VStack align="start" gap={5} h="full">
                    {/* Icon badge */}
                    <Box
                        p={4}
                        borderRadius="2xl"
                        bg={`${colorPalette}.50`}
                        color={`${colorPalette}.500`}
                    >
                        <Icon size={34} />
                    </Box>

                    {/* Title + optional badge */}
                    <HStack>
                        <Heading size="lg" color="gray.800">
                            {title}
                        </Heading>
                        {badge && (
                            <Badge colorPalette={colorPalette} variant="subtle" size="sm">
                                {badge}
                            </Badge>
                        )}
                    </HStack>

                    {/* Description */}
                    <Text color="gray.600" fontSize="md" lineHeight="tall">
                        {description}
                    </Text>

                    {/* Feature list */}
                    <VStack align="start" gap={2} flex={1}>
                        {features.map((f) => (
                            <HStack key={f} gap={2}>
                                <Text color={`${colorPalette}.500`} fontWeight="bold" fontSize="sm">
                                    ✓
                                </Text>
                                <Text fontSize="sm" color="gray.600">
                                    {f}
                                </Text>
                            </HStack>
                        ))}
                    </VStack>

                    {/* CTA button */}
                    <Button
                        colorPalette={colorPalette}
                        width="full"
                        size="lg"
                        mt={2}
                        onClick={(e) => {
                            e.stopPropagation();
                            onClick();
                        }}
                    >
                        {buttonLabel} →
                    </Button>
                </VStack>
            </Card.Body>
        </Card.Root>
    );
};

const HomePage = () => {
    const navigate = useNavigate();

    return (
        <Box minH="100vh" bg="gray.50">
            <Center py={16} px={6}>
                <Box w="full" maxW="880px">
                    <VStack gap={12} align="stretch">

                        {/* Hero */}
                        <VStack gap={3} textAlign="center">
                            <Heading
                                as="h1"
                                size="3xl"
                                color="gray.900"
                                letterSpacing="tight"
                            >
                                SFCC{' '}
                                <Box as="span" color="blue.600">
                                    Metadata Tools
                                </Box>
                            </Heading>
                            <Text
                                fontSize="lg"
                                color="gray.500"
                                maxW="540px"
                                lineHeight="tall"
                                mt={1}
                            >
                                Work with Salesforce Commerce Cloud metadata XML. Extract existing
                                preferences or build new ones from scratch.
                            </Text>
                        </VStack>

                        {/* Flow cards */}
                        <Grid
                            templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }}
                            gap={6}
                        >
                            {FLOWS.map((flow) => (
                                <GridItem key={flow.key}>
                                    <FlowCard
                                        flow={flow}
                                        onClick={() => navigate(flow.path)}
                                    />
                                </GridItem>
                            ))}
                        </Grid>

                        {/* Footer note */}
                        <Text textAlign="center" fontSize="xs" color="gray.400">
                            Fully client-side · No data leaves your browser · SFCC metadata/2006-10-31
                        </Text>
                    </VStack>
                </Box>
            </Center>
        </Box>
    );
};

export default HomePage;

