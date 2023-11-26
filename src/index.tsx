import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import React from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter, useRoutes } from 'react-router-dom'
import routers from './router'

import './styles'

function App() {
  return useRoutes(routers)
}

ReactDOM.render(
  <ConfigProvider locale={zhCN}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ConfigProvider>,
  document.getElementById('root')
)
