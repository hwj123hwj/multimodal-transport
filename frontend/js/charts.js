/**
 * Charts.js - 图表组件
 * 提供各种数据可视化图表功能
 */

class ChartManager {
    constructor() {
        this.charts = new Map();
        this.colors = {
            primary: '#3b82f6',
            success: '#10b981',
            warning: '#f59e0b',
            danger: '#ef4444',
            info: '#06b6d4',
            purple: '#8b5cf6',
            pink: '#ec4899'
        };
    }

    /**
     * 创建饼图
     */
    createPieChart(canvasId, data, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;

        // 销毁现有图表
        this.destroyChart(canvasId);

        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    backgroundColor: [
                        this.colors.primary,
                        this.colors.success,
                        this.colors.warning,
                        this.colors.danger,
                        this.colors.info,
                        this.colors.purple
                    ],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${context.label}: ${context.parsed} (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    duration: 1000
                },
                ...options
            }
        });

        this.charts.set(canvasId, chart);
        return chart;
    }

    /**
     * 创建柱状图
     */
    createBarChart(canvasId, data, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;

        this.destroyChart(canvasId);

        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: data.label || '数据',
                    data: data.values,
                    backgroundColor: this.colors.primary + '80',
                    borderColor: this.colors.primary,
                    borderWidth: 2,
                    borderRadius: 4,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        cornerRadius: 8,
                        displayColors: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                size: 11
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            font: {
                                size: 11
                            }
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart'
                },
                ...options
            }
        });

        this.charts.set(canvasId, chart);
        return chart;
    }

    /**
     * 创建折线图
     */
    createLineChart(canvasId, data, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;

        this.destroyChart(canvasId);

        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: data.datasets.map((dataset, index) => ({
                    ...dataset,
                    borderColor: this.colors[Object.keys(this.colors)[index % Object.keys(this.colors).length]],
                    backgroundColor: this.colors[Object.keys(this.colors)[index % Object.keys(this.colors).length]] + '20',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#fff',
                    pointBorderWidth: 2
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        cornerRadius: 8
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                },
                animation: {
                    duration: 1500,
                    easing: 'easeInOutQuart'
                },
                ...options
            }
        });

        this.charts.set(canvasId, chart);
        return chart;
    }

    /**
     * 创建雷达图
     */
    createRadarChart(canvasId, data, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;

        this.destroyChart(canvasId);

        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: data.labels,
                datasets: data.datasets.map((dataset, index) => ({
                    ...dataset,
                    borderColor: this.colors[Object.keys(this.colors)[index % Object.keys(this.colors).length]],
                    backgroundColor: this.colors[Object.keys(this.colors)[index % Object.keys(this.colors).length]] + '40',
                    borderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#fff',
                    pointBorderWidth: 2
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                size: 12
                            }
                        }
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        pointLabels: {
                            font: {
                                size: 11
                            }
                        }
                    }
                },
                animation: {
                    duration: 1000
                },
                ...options
            }
        });

        this.charts.set(canvasId, chart);
        return chart;
    }

    /**
     * 更新图表数据
     */
    updateChart(canvasId, newData) {
        const chart = this.charts.get(canvasId);
        if (chart) {
            chart.data = newData;
            chart.update('active');
        }
    }

    /**
     * 销毁图表
     */
    destroyChart(canvasId) {
        const chart = this.charts.get(canvasId);
        if (chart) {
            chart.destroy();
            this.charts.delete(canvasId);
        }
    }

    /**
     * 销毁所有图表
     */
    destroyAllCharts() {
        this.charts.forEach((chart, canvasId) => {
            chart.destroy();
        });
        this.charts.clear();
    }

    /**
     * 创建自定义图表
     */
    createCustomChart(canvasId, config) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;

        this.destroyChart(canvasId);

        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, config);
        
        this.charts.set(canvasId, chart);
        return chart;
    }

    /**
     * 获取图表实例
     */
    getChart(canvasId) {
        return this.charts.get(canvasId);
    }

    /**
     * 图表是否存在
     */
    hasChart(canvasId) {
        return this.charts.has(canvasId);
    }
}

// 创建全局图表管理器实例
window.chartManager = new ChartManager();