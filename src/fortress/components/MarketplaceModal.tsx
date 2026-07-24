// src/fortress/components/MarketplaceModal.tsx
import React, { useState } from 'react';
import { ShopItem, MarketplaceEngine, HaggleResult } from '../MarketplaceEngine';
import { PlayerInventory, TroopRoster } from '../types';

interface MarketplaceModalProps {
  availableItems: ShopItem[];
  inventory: PlayerInventory;
  troops: TroopRoster;
  onPurchaseComplete: (item: ShopItem, pricePaid: number) => void;
  onEjected: () => void;
  onClose: () => void;
}

export const MarketplaceModal: React.FC<MarketplaceModalProps> = ({
  availableItems,
  inventory,
  onPurchaseComplete,
  onEjected,
  onClose,
}) => {
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [bidPrice, setBidPrice] = useState<number>(0);
  const [currentQuote, setCurrentQuote] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('Welcome to the Town Marketplace!');

  const handleSelectItem = (item: ShopItem) => {
    setSelectedItem(item);
    setCurrentQuote(item.basePrice);
    setBidPrice(item.basePrice);
    setFeedback(`Selected: ${item.name}. Quote: ${item.basePrice} GP.`);
  };

  const handleConfirmBid = () => {
    if (!selectedItem) return;

    if (bidPrice > inventory.gold) {
      setFeedback('⚠️ You do not have enough Gold for this bid!');
      return;
    }

    const result: HaggleResult = MarketplaceEngine.evaluateBid(currentQuote, bidPrice);
    setFeedback(result.message);

    if (result.outcome === 'ACCEPTED' && result.finalPrice) {
      setTimeout(() => {
        onPurchaseComplete(selectedItem, result.finalPrice!);
      }, 1000);
    } else if (result.outcome === 'COUNTER' && result.counterPrice) {
      setCurrentQuote(result.counterPrice);
      setBidPrice(result.counterPrice);
    } else if (result.outcome === 'EJECTED') {
      setTimeout(() => {
        onEjected();
      }, 1200);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ backgroundColor: '#111', border: '2px solid #fbc02d', borderRadius: '8px', padding: '24px', maxWidth: '600px', width: '90%', color: '#fbc02d', fontFamily: 'monospace' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #fbc02d', paddingBottom: '10px', marginBottom: '16px' }}>
          <h2 style={{ margin: 0 }}>🏰 TOWN MARKETPLACE</h2>
          <div>💰 Your Gold: <strong>{inventory.gold} GP</strong></div>
        </div>

        {/* Item Selection Deck */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', maxHeight: '200px', overflowY: 'auto', marginBottom: '16px' }}>
          {availableItems.map((item) => (
            <div
              key={item.id}
              onClick={() => handleSelectItem(item)}
              style={{
                border: selectedItem?.id === item.id ? '2px solid #00ff00' : '1px solid #444',
                backgroundColor: selectedItem?.id === item.id ? '#222' : '#050505',
                padding: '10px',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontWeight: 'bold', color: '#fff' }}>{item.name}</div>
              <div style={{ fontSize: '12px', color: '#888' }}>Price: {item.basePrice} GP</div>
            </div>
          ))}
        </div>

        {/* Haggling Panel */}
        {selectedItem && (
          <div style={{ border: '1px dashed #fbc02d', padding: '16px', backgroundColor: '#050505', marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#fff' }}>Bargain for: {selectedItem.name}</h4>
            <p style={{ fontSize: '12px', color: '#aaa', margin: '0 0 12px 0' }}>{selectedItem.description}</p>
            
            <div style={{ marginBottom: '12px' }}>
              <label>Your Bid: <strong>{bidPrice} GP</strong> (Quote: {currentQuote} GP)</label>
              <input
                type="range"
                min={Math.floor(selectedItem.basePrice * 0.5)}
                max={selectedItem.basePrice}
                value={bidPrice}
                onChange={(e) => setBidPrice(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: '#fbc02d', marginTop: '6px' }}
              />
            </div>

            <button
              onClick={handleConfirmBid}
              style={{ backgroundColor: '#fbc02d', color: '#000', border: 'none', padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', width: '100%' }}
            >
              🤝 OFFER BID ({bidPrice} GP)
            </button>
          </div>
        )}

        {/* Status Message Display */}
        <div style={{ color: '#fff', fontSize: '13px', marginBottom: '16px', minHeight: '32px', fontStyle: 'italic', borderLeft: '3px solid #fbc02d', paddingLeft: '8px' }}>
          {feedback}
        </div>

        <button
          onClick={onClose}
          style={{ backgroundColor: '#333', color: '#aaa', border: '1px solid #555', padding: '8px 16px', cursor: 'pointer', fontFamily: 'monospace', width: '100%' }}
        >
          Exit Shop (No Purchase)
        </button>
      </div>
    </div>
  );
};