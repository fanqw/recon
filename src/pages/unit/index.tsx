import unitService from '@services/unit.service'
import { Button, Card, Form, Input, Modal, Space, Table, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import './index.scss'

const { Search } = Input

export interface DataType {
  id: string
  name: string
  desc: string
  create_at: Date
  update_at: Date
}

const Unit: React.FC = () => {
  const [list, setList] = useState([])
  const [modalData, setModalData] = useState({
    name: '',
    desc: '',
  })
  const [unitId, setUnitId] = useState('')
  const [open, setOpen] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [removeLoading, setRemoveLoading] = useState(false)
  useEffect(() => {
    handleUnitList()
  }, [])

  const handleUnitList = async () => {
    setListLoading(true)
    const res = await unitService.getUnitList()
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
    setUnitId('')
    setOpen(false)
    if (refresh) {
      handleUnitList()
    }
  }

  const handleCreateUnit = async (values: any) => {
    const res = await unitService.createUnit(values)
    setLoading(false)
    if (res?.code === 200) {
      message.success('创建成功')
      handleCloseModal(true)
      return
    }
    message.error('创建失败，请重试')
  }

  const handleUpdateUnit = async (id: string, values: any) => {
    const res = await unitService.editUnit(id, values)
    setLoading(false)
    if (res?.code === 200) {
      message.success('修改成功')
      handleCloseModal(true)
      return
    }
    message.error('修改失败，请重试')
  }

  const handleRemove = async (id: string) => {
    setUnitId(id)
    setRemoveLoading(true)
    const res = await unitService.removeUnit(id)
    setRemoveLoading(false)
    if (res?.code === 200) {
      message.success('删除成功')
      handleUnitList()
    } else {
      message.error(`删除失败，失败原因：${res.message}`)
    }
  }

  const onFinish = async (values: any) => {
    setLoading(true)
    if (unitId) {
      handleUpdateUnit(unitId, values)
    } else {
      handleCreateUnit(values)
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
        const loading = removeLoading && record.id === unitId
        return (
          <Space size="middle">
            <a
              onClick={() => {
                setUnitId(record.id)
                handleOpenModal({ name: record.name, desc: record.desc })
              }}
            >
              编辑
            </a>
            {loading ? (
              <span style={{ color: '#999' }}>删除</span>
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
      <Card title="商品单位">
        <div className="unit-header">
          <Button
            type="primary"
            onClick={() => {
              setUnitId('')
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
            className="unit-search"
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
        title="新增商单位"
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
            label="单位名称"
            name="name"
            rules={[{ required: true, message: '请输入单位名称!' }]}
          >
            <Input placeholder="请输入单位名称" />
          </Form.Item>

          <Form.Item label="单位说明" name="desc">
            <Input.TextArea placeholder="请输入单位说明" rows={5} />
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

export default Unit
