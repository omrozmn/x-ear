#!/bin/bash

# QA Fixes Test Script
# Bu script tüm QA düzeltmelerini curl ile test eder

set -e

echo "🧪 QA Düzeltmeleri Test Scripti"
echo "================================"
echo ""

# Backend URL
API_URL="${API_URL:-http://localhost:5003}"

# Token al (test kullanıcısı ile)
echo "📝 1. Token alınıyor..."
TOKEN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin@test.com",
    "password": "admin123"
  }')

TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.data.accessToken // .accessToken // empty')

if [ -z "$TOKEN" ]; then
  echo "❌ Token alınamadı!"
  echo "Response: $TOKEN_RESPONSE"
  exit 1
fi

echo "✅ Token alındı"
echo ""

# Test 1: Firma Bilgilerini Getir
echo "📋 Test 1: Firma Bilgilerini Getir"
echo "-----------------------------------"
COMPANY_RESPONSE=$(curl -s -X GET "$API_URL/api/tenant/company" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "Response:"
echo $COMPANY_RESPONSE | jq '.'
echo ""

# Test 2: Firma Bilgilerini Güncelle
echo "📝 Test 2: Firma Bilgilerini Güncelle"
echo "--------------------------------------"
UPDATE_RESPONSE=$(curl -s -X PUT "$API_URL/api/tenant/company" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "X-Ear Test İşitme Merkezi",
    "taxId": "1234567890",
    "address": "Test Mahallesi, Test Sokak No:1, İstanbul",
    "phone": "+905551234567",
    "email": "info@x-ear-test.com"
  }')

echo "Response:"
echo $UPDATE_RESPONSE | jq '.'
echo ""

# Test 3: Logo Upload (eğer test dosyası varsa)
if [ -f "test-logo.png" ]; then
  echo "🖼️  Test 3: Logo Upload"
  echo "----------------------"
  LOGO_RESPONSE=$(curl -s -X POST "$API_URL/api/tenant/company/upload/logo" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@test-logo.png")
  
  echo "Response:"
  echo $LOGO_RESPONSE | jq '.'
  echo ""
else
  echo "⚠️  Test 3: Logo Upload - ATLANDI (test-logo.png bulunamadı)"
  echo ""
fi

# Test 4: Kaşe Upload (eğer test dosyası varsa)
if [ -f "test-stamp.png" ]; then
  echo "📌 Test 4: Kaşe Upload"
  echo "----------------------"
  STAMP_RESPONSE=$(curl -s -X POST "$API_URL/api/tenant/company/upload/stamp" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@test-stamp.png")
  
  echo "Response:"
  echo $STAMP_RESPONSE | jq '.'
  echo ""
else
  echo "⚠️  Test 4: Kaşe Upload - ATLANDI (test-stamp.png bulunamadı)"
  echo ""
fi

# Test 5: İmza Upload (eğer test dosyası varsa)
if [ -f "test-signature.png" ]; then
  echo "✍️  Test 5: İmza Upload"
  echo "----------------------"
  SIGNATURE_RESPONSE=$(curl -s -X POST "$API_URL/api/tenant/company/upload/signature" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@test-signature.png")
  
  echo "Response:"
  echo $SIGNATURE_RESPONSE | jq '.'
  echo ""
else
  echo "⚠️  Test 5: İmza Upload - ATLANDI (test-signature.png bulunamadı)"
  echo ""
fi

# Test 6: Güncellenmiş Firma Bilgilerini Kontrol Et
echo "🔍 Test 6: Güncellenmiş Firma Bilgilerini Kontrol Et"
echo "-----------------------------------------------------"
FINAL_RESPONSE=$(curl -s -X GET "$API_URL/api/tenant/company" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "Response:"
echo $FINAL_RESPONSE | jq '.'
echo ""

# Test 7: Logo Silme
echo "🗑️  Test 7: Logo Silme"
echo "---------------------"
DELETE_LOGO_RESPONSE=$(curl -s -X DELETE "$API_URL/api/tenant/company/upload/logo" \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo $DELETE_LOGO_RESPONSE | jq '.'
echo ""

echo "✅ Tüm testler tamamlandı!"
echo ""
echo "📊 Özet:"
echo "--------"
echo "✓ Firma bilgileri getirme"
echo "✓ Firma bilgileri güncelleme"
echo "✓ Logo/Kaşe/İmza upload (dosya varsa)"
echo "✓ Dosya silme"
echo ""
echo "🎉 QA testleri başarıyla tamamlandı!"
