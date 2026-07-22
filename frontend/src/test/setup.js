// src/test/setup.js
import { JSDOM } from 'jsdom';
import { expect } from 'chai';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Setup JSDOM
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
});

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;
global.Node = dom.window.Node;

// Mock fetch if needed
global.fetch = require('node-fetch');

// Clean up after each test
afterEach(() => {
  cleanup();
});

// Make chai assertions available globally
global.expect = expect;