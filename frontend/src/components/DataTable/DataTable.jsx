import React, { useState, useEffect } from 'react';
import { Table, Input, Button, Space, Select, Tag, message } from 'antd';
import { SearchOutlined, FilterOutlined, ExportOutlined, ReloadOutlined } from '@ant-design/icons';
import { formatNumber, formatCurrency, formatWeight, formatVolume, formatTime, formatDistance } from '../../utils/formatters';
import { PAGINATION_CONFIG } from '../../utils/constants';
import './DataTable.css';

const { Search } = Input;
const { Option } = Select;

const DataTable = ({
  data = [],
  columns = [],
  loading = false,
  title = '',
  searchable = true,
  filterable = true,
  exportable = true,
  reloadable = true,
  rowKey = 'id',
  onRowClick,
  onSelectionChange,
  selectedRowKeys = [],
  pagination = PAGINATION_CONFIG,
  scroll = { x: 'max-content' },
  size = 'middle',
  className = '',
  style = {},
  ...props
}) => {
  const [searchText, setSearchText] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [filters, setFilters] = useState({});
  const [sortedInfo, setSortedInfo] = useState({});

  // 处理数据过滤
  useEffect(() => {
    let filtered = [...data];

    // 搜索过滤
    if (searchText) {
      filtered = filtered.filter(record => {
        return Object.values(record).some(value => {
          if (value === null || value === undefined) return false;
          return value.toString().toLowerCase().includes(searchText.toLowerCase());
        });
      });
    }

    // 列过滤器过滤
    Object.keys(filters).forEach(key => {
      const filterValues = filters[key];
      if (filterValues && filterValues.length > 0) {
        filtered = filtered.filter(record => {
          return filterValues.includes(record[key]);
        });
      }
    });

    setFilteredData(filtered);
  }, [data, searchText, filters]);

  // 处理搜索
  const handleSearch = (value) => {
    setSearchText(value);
  };

  // 处理过滤器变化
  const handleFilterChange = (columnKey, values) => {
    setFilters(prev => ({
      ...prev,
      [columnKey]: values
    }));
  };

  // 处理排序
  const handleSortChange = (sorter) => {
    setSortedInfo(sorter);
  };

  // 处理表格变化
  const handleTableChange = (pagination, filters, sorter) => {
    setFilters(filters);
    setSortedInfo(sorter);
  };

  // 导出数据
  const handleExport = () => {
    try {
      const exportData = filteredData.map(record => {
        const exportRecord = {};
        columns.forEach(col => {
          if (col.dataIndex && col.export !== false) {
            const value = record[col.dataIndex];
            exportRecord[col.title] = value;
          }
        });
        return exportRecord;
      });

      // 转换为CSV格式
      const csvContent = convertToCSV(exportData);
      downloadFile(csvContent, `${title || 'data'}_${new Date().getTime()}.csv`, 'text/csv');
      
      message.success('数据导出成功');
    } catch (error) {
      message.error('数据导出失败');
      console.error('Export error:', error);
    }
  };

  // 转换为CSV格式
  const convertToCSV = (data) => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        return value === null || value === undefined ? '' : `"${value}"`;
      }).join(',')
    );
    
    return [csvHeaders, ...csvRows].join('\n');
  };

  // 下载文件
  const downloadFile = (content, filename, contentType) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 处理行点击
  const handleRowClick = (record) => {
    if (onRowClick) {
      onRowClick(record);
    }
  };

  // 处理选择变化
  const handleSelectionChange = (selectedKeys, selectedRows) => {
    if (onSelectionChange) {
      onSelectionChange(selectedKeys, selectedRows);
    }
  };

  // 处理重新加载
  const handleReload = () => {
    if (props.onReload) {
      props.onReload();
    }
  };

  // 获取增强的列配置
  const getEnhancedColumns = () => {
    return columns.map(col => {
      const enhancedCol = { ...col };

      // 添加默认排序
      if (col.sorter !== false && !col.sorter) {
        enhancedCol.sorter = (a, b) => {
          if (a[col.dataIndex] === null || a[col.dataIndex] === undefined) return -1;
          if (b[col.dataIndex] === null || b[col.dataIndex] === undefined) return 1;
          return a[col.dataIndex] - b[col.dataIndex];
        };
      }

      // 添加默认格式化
      if (col.format && !col.render) {
        enhancedCol.render = (value) => {
          switch (col.format) {
            case 'currency':
              return formatCurrency(value);
            case 'weight':
              return formatWeight(value);
            case 'volume':
              return formatVolume(value);
            case 'time':
              return formatTime(value);
            case 'distance':
              return formatDistance(value);
            case 'number':
              return formatNumber(value);
            default:
              return value;
          }
        };
      }

      // 添加过滤器
      if (col.filterable && !col.filters) {
        const uniqueValues = [...new Set(data.map(record => record[col.dataIndex]))].filter(Boolean);
        enhancedCol.filters = uniqueValues.map(value => ({
          text: value,
          value: value
        }));
      }

      // 添加过滤器处理
      if (col.filters) {
        enhancedCol.filteredValue = filters[col.dataIndex] || null;
        enhancedCol.onFilter = (value, record) => record[col.dataIndex] === value;
      }

      return enhancedCol;
    });
  };

  // 工具栏
  const renderToolbar = () => {
    if (!searchable && !filterable && !exportable && !reloadable) {
      return null;
    }

    return (
      <div className="data-table-toolbar">
        <Space>
          {searchable && (
            <Search
              placeholder="搜索..."
              allowClear
              enterButton={<SearchOutlined />}
              size="middle"
              style={{ width: 250 }}
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              onSearch={handleSearch}
            />
          )}
          
          {filterable && (
            <Button icon={<FilterOutlined />}>
              筛选
            </Button>
          )}
          
          {reloadable && (
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReload}
              loading={loading}
            >
              刷新
            </Button>
          )}
          
          {exportable && (
            <Button
              icon={<ExportOutlined />}
              onClick={handleExport}
            >
              导出
            </Button>
          )}
        </Space>
        
        <div className="data-table-stats">
          共 {filteredData.length} 条记录
        </div>
      </div>
    );
  };

  // 行选择配置
  const rowSelection = onSelectionChange ? {
    selectedRowKeys,
    onChange: handleSelectionChange,
    preserveSelectedRowKeys: true,
    getCheckboxProps: (record) => ({
      disabled: record.disabled,
      name: record[rowKey]
    })
  } : undefined;

  return (
    <div className={`data-table ${className}`} style={style}>
      {title && <div className="data-table-title">{title}</div>}
      {renderToolbar()}
      
      <Table
        {...props}
        columns={getEnhancedColumns()}
        dataSource={filteredData}
        loading={loading}
        rowKey={rowKey}
        rowSelection={rowSelection}
        pagination={pagination}
        scroll={scroll}
        size={size}
        onChange={handleTableChange}
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          style: { cursor: onRowClick ? 'pointer' : 'default' }
        })}
        className="data-table-content"
      />
    </div>
  );
};

// 默认属性
DataTable.defaultProps = {
  data: [],
  columns: [],
  loading: false,
  title: '',
  searchable: true,
  filterable: true,
  exportable: true,
  reloadable: true,
  rowKey: 'id',
  pagination: PAGINATION_CONFIG,
  scroll: { x: 'max-content' },
  size: 'middle',
  className: '',
  style: {}
};

export default DataTable;