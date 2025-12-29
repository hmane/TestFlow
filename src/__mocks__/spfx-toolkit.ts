/**
 * SPFx Toolkit Mocks
 * Provides mock implementations for spfx-toolkit modules
 */

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  success: jest.fn(),
  debug: jest.fn(),
  setLogLevel: jest.fn(),
};

// Mock current user
const mockCurrentUser = {
  id: 1,
  email: 'testuser@contoso.com',
  title: 'Test User',
  loginName: 'i:0#.f|membership|testuser@contoso.com',
};

// Mock SP context
export const SPContext = {
  logger: mockLogger,
  currentUser: mockCurrentUser,
  webAbsoluteUrl: 'https://contoso.sharepoint.com/sites/test',
  siteAbsoluteUrl: 'https://contoso.sharepoint.com/sites/test',
  environment: 'Test',
  isInitialized: true,
  sp: {
    web: {
      lists: {
        getByTitle: jest.fn().mockReturnValue({
          items: {
            getById: jest.fn().mockReturnValue({
              update: jest.fn().mockResolvedValue({}),
              delete: jest.fn().mockResolvedValue({}),
            }),
            add: jest.fn().mockResolvedValue({ data: { Id: 1 } }),
            select: jest.fn().mockReturnThis(),
            expand: jest.fn().mockReturnThis(),
            filter: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            top: jest.fn().mockReturnValue(jest.fn().mockResolvedValue([])),
          },
        }),
      },
      currentUser: {
        groups: jest.fn().mockResolvedValue([]),
      },
    },
  },
  smart: jest.fn().mockResolvedValue(undefined),
};

// Mock list item helper
export const createSPExtractor = jest.fn().mockReturnValue({
  string: jest.fn().mockReturnValue(''),
  number: jest.fn().mockReturnValue(0),
  boolean: jest.fn().mockReturnValue(false),
  date: jest.fn().mockReturnValue(undefined),
  user: jest.fn().mockReturnValue(undefined),
  userMulti: jest.fn().mockReturnValue([]),
  lookup: jest.fn().mockReturnValue(undefined),
  lookupMulti: jest.fn().mockReturnValue([]),
  multiChoice: jest.fn().mockReturnValue([]),
});

export const createSPUpdater = jest.fn().mockReturnValue({
  set: jest.fn(),
  hasChanges: jest.fn().mockReturnValue(true),
  getUpdates: jest.fn().mockReturnValue({}),
});

export const shouldPerformUpdate = jest.fn().mockReturnValue({
  shouldUpdate: true,
  changedFields: [],
});

// Mock Card components
export const Card = jest.fn().mockImplementation(({ children }) => children);
export const CardHeader = jest.fn().mockImplementation(({ children }) => children);
export const CardBody = jest.fn().mockImplementation(({ children }) => children);
export const CardFooter = jest.fn().mockImplementation(({ children }) => children);

// Mock Form components
export const FormContainer = jest.fn().mockImplementation(({ children }) => children);
export const FormItem = jest.fn().mockImplementation(({ children }) => children);
export const FormLabel = jest.fn().mockImplementation(({ children }) => children);
export const FormValue = jest.fn().mockImplementation(({ children }) => children);
export const FormError = jest.fn().mockImplementation(({ children }) => children);

// Mock DevExtreme wrappers
export const DevExtremeTextBox = jest.fn().mockReturnValue(null);
export const DevExtremeDateBox = jest.fn().mockReturnValue(null);
export const DevExtremeSelectBox = jest.fn().mockReturnValue(null);
export const DevExtremeTextArea = jest.fn().mockReturnValue(null);

// Default export
export default {
  SPContext,
  createSPExtractor,
  createSPUpdater,
  shouldPerformUpdate,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  FormContainer,
  FormItem,
  FormLabel,
  FormValue,
  FormError,
  DevExtremeTextBox,
  DevExtremeDateBox,
  DevExtremeSelectBox,
  DevExtremeTextArea,
};
