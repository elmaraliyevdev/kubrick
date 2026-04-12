import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { configureStore } from '@reduxjs/toolkit'
import authReducer from '@/store/authSlice'
import { TooltipProvider } from '@/components/ui/tooltip'

// Create a test store
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: initialState,
  })
}

// Create a test query client
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
})

interface AllProvidersProps {
  children: React.ReactNode
  initialState?: any
  withRouter?: boolean
}

const AllProviders = ({ children, initialState = {}, withRouter = true }: AllProvidersProps) => {
  const store = createTestStore(initialState)
  const queryClient = createTestQueryClient()
  const content = withRouter ? <BrowserRouter>{children}</BrowserRouter> : children
  
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {content}
        </TooltipProvider>
      </QueryClientProvider>
    </Provider>
  )
}

const customRender = (
  ui: ReactElement,
  options: RenderOptions & { initialState?: any } = {}
) => {
  const { initialState, ...renderOptions } = options
  
  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders initialState={initialState}>
        {children}
      </AllProviders>
    ),
    ...renderOptions,
  })
}

const renderWithoutRouter = (
  ui: ReactElement,
  options: RenderOptions & { initialState?: any } = {}
) => {
  const { initialState, ...renderOptions } = options

  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders initialState={initialState} withRouter={false}>
        {children}
      </AllProviders>
    ),
    ...renderOptions,
  })
}

export * from '@testing-library/react'
export { customRender as render, renderWithoutRouter }
