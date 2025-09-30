// hooks/useCategories.js
import { useState, useEffect } from 'react';
import { getCategories, createCategory, updateCategory, deleteCategory, getCategoryStats } from '../services/categoryService';

export const useCategories = (initialOptions = {}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({});
  const [options, setOptions] = useState(initialOptions);

  const fetchCategories = async (newOptions = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const mergedOptions = { ...options, ...newOptions };
      const result = await getCategories(mergedOptions);
      
      setData(result.data);
      setPagination(result.pagination);
      setOptions(mergedOptions);
    } catch (err) {
      setError(err.message);
      console.error('获取类别失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async (categoryData) => {
    try {
      setLoading(true);
      const newCategory = await createCategory(categoryData);
      setData(prev => [newCategory, ...prev]);
      return newCategory;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const modifyCategory = async (categoryId, updateData) => {
    try {
      setLoading(true);
      const updatedCategory = await updateCategory(categoryId, updateData);
      setData(prev => prev.map(item => 
        item.id === categoryId ? { ...item, ...updatedCategory } : item
      ));
      return updatedCategory;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeCategory = async (categoryId) => {
    try {
      setLoading(true);
      await deleteCategory(categoryId);
      setData(prev => prev.filter(item => item.id !== categoryId));
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return {
    data,
    loading,
    error,
    pagination,
    options,
    refetch: fetchCategories,
    addCategory,
    updateCategory: modifyCategory,
    deleteCategory: removeCategory,
    setOptions: (newOptions) => fetchCategories(newOptions)
  };
};

// 统计信息的Hook
export const useCategoryStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await getCategoryStats();
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return { stats, loading, error, refetch: fetchStats };
};