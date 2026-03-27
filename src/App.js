import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { ChakraProvider, defaultSystem, Box, Button, HStack, Text } from '@chakra-ui/react';
import XMLCheckboxTree from "./XMLCheckboxTree";
import HomePage from "./components/HomePage";
import CreatePreferences from "./components/CreatePreferences";

const SCREEN_LABELS = {
    '/extract': 'Extract from XML',
    '/create': 'Create from Scratch',
};

function Breadcrumb() {
    const location = useLocation();
    const navigate = useNavigate();
    const isHome = location.pathname === '/';

    if (isHome) return null;

    return (
        <Box
            px={4}
            py={2}
            bg="white"
            borderBottom="1px solid"
            borderColor="gray.200"
            position="sticky"
            top={0}
            zIndex={100}
        >
            <HStack gap={2}>
                <Button
                    variant="ghost"
                    size="sm"
                    colorPalette="gray"
                    onClick={() => navigate('/')}
                >
                    ← Home
                </Button>
                <Text fontSize="sm" color="gray.300" userSelect="none">/</Text>
                <Text fontSize="sm" color="gray.600" fontWeight="medium">
                    {SCREEN_LABELS[location.pathname] || 'Unknown'}
                </Text>
            </HStack>
        </Box>
    );
}

function App() {
    return (
        <ChakraProvider value={defaultSystem}>
            <BrowserRouter basename="/dw_sitepref_extractor">
                <Breadcrumb />
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/extract" element={<XMLCheckboxTree />} />
                    <Route path="/create" element={<CreatePreferences />} />
                </Routes>
            </BrowserRouter>
        </ChakraProvider>
    );
}

export default App;
