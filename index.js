import 'react-native-reanimated';
import { configureReanimatedLogger } from 'react-native-reanimated';

// Disable strict mode warnings from third-party libraries (React Navigation)
configureReanimatedLogger({ strict: false });

// Intercept global errors to print them cleanly in metro logs
if (typeof ErrorUtils !== 'undefined') {
    const originalHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error, isFatal) => {
        console.error('\n\n🚨 FATAL CRASH 🚨\n', error?.message || error, '\n', error?.stack, '\n\n');
        originalHandler(error, isFatal);
    });
}

import 'react-native-gesture-handler';
import './global.css';
import App from './App';

// register the root component
import { registerRootComponent } from 'expo';

registerRootComponent(App);
