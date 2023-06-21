// src/router/index.tsx
import React, { lazy, ReactNode, Suspense } from 'react'
import { Navigate, RouteObject } from 'react-router-dom'
import Login from '@pages/login'
import Layout from '@pages/layout'
const Category = lazy(() => import('@pages/category'))
const Commodity = lazy(() => import('@pages/commodity'))
const Unit = lazy(() => import('@pages/unit'))
const Order = lazy(() => import('@pages/order'))
const OrderCommodity = lazy(() => import('@pages/order-commodity'))

const lazyLoad = (children: ReactNode): ReactNode => {
  return <Suspense fallback={<h1>Loading...</h1>}>{children}</Suspense>
}

const routers: RouteObject[] = [
  {
    path: '/login',
    element: <Login name="login" />,
  },
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        path: '/basic',
        // element: <Navigate to="/basic/category" />,
        children: [
          {
            path: '/basic/category',
            element: lazyLoad(<Category />),
          },
          {
            path: '/basic/unit',
            element: lazyLoad(<Unit />),
          },
          {
            path: '/basic/commodity',
            element: lazyLoad(<Commodity />),
          },
          {
            path: '/basic',
            element: <Navigate to="/basic/category" />,
          },
          {
            path: '*',
            element: <p>404</p>,
          },
        ],
      },
      {
        path: '/order',
        children: [
          {
            path: '/order/commodity',
            element: lazyLoad(<OrderCommodity />),
          },
          {
            path: '/order/list',
            element: lazyLoad(<Order />),
          },
          {
            path: '/order',
            element: <Navigate to="/order/commodity" />,
          },
          {
            path: '*',
            element: <p>404</p>,
          },
        ],
      },
      {
        path: '/',
        element: <Navigate to="/basic" />,
      },
      {
        path: '*',
        element: <p>404</p>,
      },
    ],
  },
  {
    path: '*',
    element: lazyLoad(<p>404</p>),
  },
]

export default routers
