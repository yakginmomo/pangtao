import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { AccountsPage } from '../pages/AccountsPage';
import { LoansPage } from '../pages/LoansPage';
import { AdminUsersPage } from '../pages/AdminUsersPage';
import { NewTransactionPage } from '../pages/NewTransactionPage';
import { TransactionHistoryPage } from '../pages/TransactionHistoryPage';
import { TransactionDetailPage } from '../pages/TransactionDetailPage';
import { EditTransactionPage } from '../pages/EditTransactionPage';
import { FavoritesPage } from '../pages/FavoritesPage';
import { SummaryPage } from '../pages/SummaryPage';
import { ProtectedRoute } from './ProtectedRoute';

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute allowedRole="USER">
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/accounts"
        element={
          <ProtectedRoute allowedRole="USER">
            <AccountsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/loans"
        element={
          <ProtectedRoute allowedRole="USER">
            <LoansPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transactions/new"
        element={
          <ProtectedRoute allowedRole="USER">
            <NewTransactionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transactions"
        element={
          <ProtectedRoute allowedRole="USER">
            <TransactionHistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transactions/:id/edit"
        element={
          <ProtectedRoute allowedRole="USER">
            <EditTransactionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transactions/:id"
        element={
          <ProtectedRoute allowedRole="USER">
            <TransactionDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/favorites"
        element={
          <ProtectedRoute allowedRole="USER">
            <FavoritesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/summary"
        element={
          <ProtectedRoute allowedRole="USER">
            <SummaryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRole="ADMIN">
            <AdminUsersPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
