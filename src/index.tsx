import React from 'react'
import ReactDOM from 'react-dom'
import { Route, Routes, BrowserRouter } from 'react-router-dom'
import Login from '@pages/login';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login name="home" />} />
        <Route path="/login" element={<Login name="login" />} />
        <Route path="*" Component={() => <p>404</p>} />
      </Routes>
    </BrowserRouter>
  )
}

ReactDOM.render(<App />, document.getElementById('root'))