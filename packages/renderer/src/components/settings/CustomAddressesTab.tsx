import { Button } from '@astryxdesign/core/Button'
import { FormLayout } from '@astryxdesign/core/FormLayout'
import { LayoutContent } from '@astryxdesign/core/Layout'
import { Section } from '@astryxdesign/core/Section'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Text, Heading } from '@astryxdesign/core/Text'
import { useStore } from '@tanstack/react-store'
import { useState } from 'react'
import { customAddressStore, addAddress, removeAddress } from '~/stores/custom-address-store'

export function CustomAddressesTab() {
  const addresses = useStore(customAddressStore, s => s.addresses)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [iconPreview, setIconPreview] = useState<string | null>(null)

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setIconPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleAdd = () => {
    if (!name.trim() || !url.trim()) return
    addAddress({ name: name.trim(), url: url.trim(), icon: iconPreview })
    setName('')
    setUrl('')
    setIconPreview(null)
  }

  return (
    <LayoutContent>
      <Section dividers={['bottom']}>
        <Heading level={4}>Add Custom Address</Heading>
        <FormLayout>
          <TextInput label="Name" placeholder="My Service" value={name} onChange={setName} />
          <TextInput label="URL" placeholder="https://example.com" value={url} onChange={setUrl} />

          <div className="flex flex-col gap-2">
            <Text type="supporting" color="secondary">Icon (optional)</Text>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer px-3 py-1.5 rounded-md border border-gray-300 text-sm hover:bg-gray-50 transition-colors">
                Choose image
                <input type="file" accept="image/*" className="hidden" onChange={handleIconUpload} />
              </label>
              {iconPreview && (
                <img src={iconPreview} alt="Preview" className="size-8 rounded object-cover" />
              )}
            </div>
          </div>

          <Button
            label="Add address"
            variant="primary"
            onClick={handleAdd}
            isDisabled={!name.trim() || !url.trim()}
          />
        </FormLayout>
      </Section>

      {addresses.length > 0 && (
        <Section dividers={['bottom']}>
          <Heading level={4}>Saved Addresses ({addresses.length})</Heading>
          <div className="flex flex-col gap-2">
            {addresses.map(addr => (
              <div key={addr.id} className="flex items-center gap-3 p-2 rounded-md border border-gray-200">
                {addr.icon ? (
                  <img src={addr.icon} alt={addr.name} className="size-6 rounded object-cover shrink-0" />
                ) : (
                  <div className="size-6 rounded bg-gray-200 shrink-0 flex items-center justify-center text-xs text-gray-500">
                    {addr.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <Text type="body" className="truncate">{addr.name}</Text>
                  <Text type="supporting" color="disabled" className="truncate">{addr.url}</Text>
                </div>
                <Button
                  label="Remove"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAddress(addr.id)}
                />
              </div>
            ))}
          </div>
        </Section>
      )}
    </LayoutContent>
  )
}
