'use client'

import { useState } from 'react'
import { Plus, Save, Trash2, Ticket } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import {
  useAdminTicketProducts,
  useCreateTicketProduct,
  useDeleteTicketProduct,
  useUpdateTicketProduct,
} from '@/lib/hooks/useAdminTicket'
import type { TicketProductItem } from '@/lib/api/types'

interface ProductForm {
  name: string
  sessionCount: string
  price: string
}

const emptyForm: ProductForm = {
  name: '',
  sessionCount: '',
  price: '',
}

function toForm(product: TicketProductItem): ProductForm {
  return {
    name: product.name,
    sessionCount: String(product.sessionCount),
    price: String(product.price),
  }
}

function toPayload(form: ProductForm) {
  return {
    name: form.name.trim(),
    sessionCount: Number(form.sessionCount),
    price: Number(form.price),
  }
}

function validate(form: ProductForm) {
  const payload = toPayload(form)
  if (!payload.name) return '이용권 이름을 입력해주세요.'
  if (!Number.isFinite(payload.sessionCount) || payload.sessionCount < 1) return '이용 횟수는 1회 이상이어야 해요.'
  if (!Number.isFinite(payload.price) || payload.price < 0) return '가격은 0원 이상이어야 해요.'
  return null
}

export default function AdminTicketsPage() {
  const { data: products = [], isLoading } = useAdminTicketProducts()
  const createMutation = useCreateTicketProduct()
  const updateMutation = useUpdateTicketProduct()
  const deleteMutation = useDeleteTicketProduct()
  const [newForm, setNewForm] = useState<ProductForm>(emptyForm)
  const [editing, setEditing] = useState<Record<string, ProductForm>>({})

  const handleCreate = async () => {
    const message = validate(newForm)
    if (message) {
      alert(message)
      return
    }
    await createMutation.mutateAsync(toPayload(newForm))
    setNewForm(emptyForm)
  }

  const handleUpdate = async (id: string) => {
    const form = editing[id]
    const message = validate(form)
    if (message) {
      alert(message)
      return
    }
    await updateMutation.mutateAsync({ id, data: toPayload(form) })
  }

  const handleDelete = async (product: TicketProductItem) => {
    if (!confirm(`${product.name} 상품을 삭제할까요? 기존 구매 내역은 그대로 유지돼요.`)) return
    await deleteMutation.mutateAsync(product.id)
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Ticket size={24} className="text-[#C8392B]" />
          <h1 className="font-bold text-[22px] text-foreground">이용권 설정</h1>
        </div>
        <p className="mt-2 text-sm text-[#767676]">
          우연한 식탁에서 판매할 이용권 이름, 횟수, 가격을 설정해요. 고객 결제 화면에는 여기 있는 상품만 노출됩니다.
        </p>
      </div>

      <section className="mb-6 rounded-[16px] bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
        <h2 className="mb-4 text-base font-bold text-[#1A1A1A]">새 이용권 추가</h2>
        <div className="grid gap-3 md:grid-cols-[1fr_140px_160px_auto]">
          <input
            value={newForm.name}
            onChange={(e) => setNewForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="예: 우연한 식탁 3회권"
            className="rounded-[12px] border border-[#F0EBE8] px-4 py-3 text-sm outline-none focus:border-[#C8392B]"
          />
          <input
            value={newForm.sessionCount}
            onChange={(e) => setNewForm((prev) => ({ ...prev, sessionCount: e.target.value }))}
            type="number"
            min={1}
            placeholder="횟수"
            className="rounded-[12px] border border-[#F0EBE8] px-4 py-3 text-sm outline-none focus:border-[#C8392B]"
          />
          <input
            value={newForm.price}
            onChange={(e) => setNewForm((prev) => ({ ...prev, price: e.target.value }))}
            type="number"
            min={0}
            placeholder="가격"
            className="rounded-[12px] border border-[#F0EBE8] px-4 py-3 text-sm outline-none focus:border-[#C8392B]"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={createMutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-[12px] bg-[#C8392B] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            <Plus size={16} />
            추가
          </button>
        </div>
      </section>

      <section className="rounded-[16px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
        <div className="border-b border-[#F0EBE8] px-5 py-4">
          <h2 className="text-base font-bold text-[#1A1A1A]">현재 판매 상품</h2>
        </div>
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : products.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#767676]">
            등록된 이용권 상품이 없어요. 위에서 먼저 상품을 추가해주세요.
          </div>
        ) : (
          <div className="divide-y divide-[#F0EBE8]">
            {products.map((product) => {
              const form = editing[product.id] ?? toForm(product)
              return (
                <div key={product.id} className="grid gap-3 p-5 md:grid-cols-[1fr_120px_150px_auto_auto]">
                  <input
                    value={form.name}
                    onChange={(e) => setEditing((prev) => ({
                      ...prev,
                      [product.id]: { ...form, name: e.target.value },
                    }))}
                    className="rounded-[12px] border border-[#F0EBE8] px-4 py-3 text-sm outline-none focus:border-[#C8392B]"
                  />
                  <input
                    value={form.sessionCount}
                    onChange={(e) => setEditing((prev) => ({
                      ...prev,
                      [product.id]: { ...form, sessionCount: e.target.value },
                    }))}
                    type="number"
                    min={1}
                    className="rounded-[12px] border border-[#F0EBE8] px-4 py-3 text-sm outline-none focus:border-[#C8392B]"
                  />
                  <input
                    value={form.price}
                    onChange={(e) => setEditing((prev) => ({
                      ...prev,
                      [product.id]: { ...form, price: e.target.value },
                    }))}
                    type="number"
                    min={0}
                    className="rounded-[12px] border border-[#F0EBE8] px-4 py-3 text-sm outline-none focus:border-[#C8392B]"
                  />
                  <button
                    type="button"
                    onClick={() => handleUpdate(product.id)}
                    disabled={updateMutation.isPending}
                    className="inline-flex items-center justify-center gap-2 rounded-[12px] bg-[#1A1A1A] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                  >
                    <Save size={16} />
                    저장
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(product)}
                    disabled={deleteMutation.isPending}
                    className="inline-flex items-center justify-center gap-2 rounded-[12px] border border-red-100 px-4 py-3 text-sm font-bold text-red-500 disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                    삭제
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
