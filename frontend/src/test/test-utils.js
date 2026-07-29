// src/test/test-utils.js
import React from 'react';
import { render as rtlRender } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux'; // If using Redux
import { store } from '../store'; // Adjust path as needed

// Custom render function with providers
function render(ui, options = {}) {
  return rtlRender(ui, {
    wrapper: ({ children }) => (
      <Provider store={store}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </Provider>
    ),
    ...options,
  });
}

export * from '@testing-library/react';
export { render };