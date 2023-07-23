import categoryService from '@services/category.service'
import { Button, Card, Form, Input, Modal, Space, Table, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import './index.scss'

const { Search } = Input

interface DataType {
  id: string
  name: string
  desc: string
  create_at: Date
  update_at: Date
}

const Category: React.FC = () => {
  const [list, setList] = useState([])
  const [modalData, setModalData] = useState({
    name: '',
    desc: '',
  })
  const [categoryId, setCategoryId] = useState('')
  const [open, setOpen] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [removeLoading, setRemoveLoading] = useState(false)
  useEffect(() => {
    handleCategoryList()
  }, [])

  const handleCategoryList = async () => {
    setListLoading(true)
    const res = await categoryService.getCategoryList()
    setListLoading(false)
    if (res.code === 200) {
      setList(res.data)
    } else {
      setList([])
    }
  }

  const handleOpenModal = (data: any) => {
    setModalData(data)
    setOpen(true)
  }

  const handleCloseModal = (refresh: boolean) => {
    setModalData({
      name: '',
      desc: '',
    })
    setCategoryId('')
    setOpen(false)
    if (refresh) {
      handleCategoryList()
    }
  }

  const handleCreateCategory = async (values: any) => {
    const res = await categoryService.createCategory(values)
    setLoading(false)
    if (res?.code === 200) {
      message.success('创建成功')
      handleCloseModal(true)
      return
    }
    message.success('创建失败，请重试')
  }

  const handleUpdateCategory = async (id: string, values: any) => {
    const res = await categoryService.editCategory(id, values)
    setLoading(false)
    if (res?.code === 200) {
      message.success('修改成功')
      handleCloseModal(true)
      return
    }
    message.success('修改失败，请重试')
  }

  const handleRemove = async (id: string) => {
    setCategoryId(id)
    setRemoveLoading(true)
    const res = await categoryService.removeCategory(id)
    setRemoveLoading(false)
    if (res?.code === 200) {
      message.success('删除成功')
      handleCategoryList()
    } else {
      message.error(`删除失败，失败原因：${res.message}`)
    }
  }

  const onFinish = async (values: any) => {
    if (categoryId) {
      handleUpdateCategory(categoryId, values)
    } else {
      handleCreateCategory(values)
    }
  }

  const onFinishFailed = (errorInfo: any) => {
    console.log('Failed:', errorInfo)
  }

  const columns: ColumnsType<DataType> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <a>{text}</a>,
    },
    {
      title: '说明',
      dataIndex: 'desc',
      key: 'desc',
    },
    {
      title: '更新时间',
      dataIndex: 'update_at',
      key: 'update_at',
      render: (value) =>
        value ? dayjs(value).format('YYYY-MM-DD HH:MM:ss') : '--',
    },
    {
      title: '创建时间',
      dataIndex: 'create_at',
      key: 'create_at',
      render: (value) =>
        value ? dayjs(value).format('YYYY-MM-DD HH:MM:ss') : '--',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => {
        const loading = removeLoading && record.id === categoryId
        return (
          <Space size="middle">
            <a
              onClick={() => {
                setCategoryId(record.id)
                handleOpenModal({ name: record.name, desc: record.desc })
              }}
            >
              编辑
            </a>
            {loading ? (
              <span style={{ color: '#999' }}>删除中...</span>
            ) : (
              <a onClick={() => handleRemove(record.id)}>删除</a>
            )}
          </Space>
        )
      },
    },
  ]
  return (
    <>
      <Card title="商品分类">
        <div className="category-header">
          <Button
            type="primary"
            onClick={() => {
              setCategoryId('')
              handleOpenModal({ name: '', desc: '' })
            }}
          >
            新增
          </Button>
          <Search
            placeholder="请输入名称、说明搜索"
            allowClear
            enterButton="搜索"
            size="middle"
            className="category-search"
            // onSearch={onSearch}
          />
        </div>
        <Table
          rowKey="id"
          loading={listLoading}
          columns={columns}
          dataSource={list}
        />
      </Card>
      <Modal
        title="新增商品种类"
        open={open}
        footer={false}
        onCancel={() => setOpen(false)}
        destroyOnClose
      >
        <Form
          name="basic"
          labelCol={{ span: 4 }}
          wrapperCol={{ span: 18 }}
          style={{ maxWidth: 600 }}
          initialValues={modalData}
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          autoComplete="off"
        >
          <Form.Item
            label="品种名称"
            name="name"
            rules={[{ required: true, message: '请输入品种名称!' }]}
          >
            <Input placeholder="请输入品种名称" />
          </Form.Item>

          <Form.Item label="品种说明" name="desc">
            <Input.TextArea placeholder="请输入品种说明" rows={5} />
          </Form.Item>

          <Form.Item wrapperCol={{ offset: 10, span: 14 }}>
            <Button type="primary" htmlType="submit" loading={loading}>
              保存
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default Category
