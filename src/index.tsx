import React from 'react'
import ReactDOM from 'react-dom'
import { Route, Routes, BrowserRouter, useRoutes } from 'react-router-dom'
import Login from '@pages/login'
import Layout from '@pages/layout'
import routers from './router'

import './styles'
{
  /* <Routes>
  <Route path="/login" element={<Login name="login" />} />
  <Route path="/" element={<Layout />} />
  <Route path="/123" element={<p>123</p>} />
  <Route path="*" element={<p>404</p>} />
</Routes> */
}

function App() {
  return useRoutes(routers)
}

ReactDOM.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
  document.getElementById('root')
)
