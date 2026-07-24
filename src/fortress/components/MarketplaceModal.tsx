// src/fortress/components/MarketplaceModal.tsx
import React, { useState } from 'react';
import { ShopItem, MarketplaceEngine, HaggleResult } from '../MarketplaceEngine';
import { PlayerInventory, TroopRoster } from '../types';
import { FORTRESS_LANG } from '../languages';

interface MarketplaceModalProps {
  availableItems: ShopItem[];
  inventory: PlayerInventory;
  troops: TroopRoster;
  locale: 'en' | 'vi';
  onPurchaseComplete: (item: ShopItem, pricePaid: number) => void;
  onEjected: () => void;
  onClose: () => void;
}

export const MarketplaceModal: React.FC<MarketplaceModalProps> = ({
  availableItems,
  inventory,
  locale,
  onPurchaseComplete,
  onEjected,
  onClose,
}) => {
  const t = FORTRESS_LANG[locale];
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [bidPrice, setBidPrice] = useState<number>(0);
  const [currentQuote, setCurrentQuote] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>(t.shopWelcome);

  const [completedResult, setCompletedResult] = useState<{
    type: 'ACCEPTED' | 'EJECTED';
    item: ShopItem;
    pricePaid?: number;
    message: string;
  } | null>(null);

  const getItemName = (item: ShopItem) => (t as any)[item.nameKey] || item.nameKey;
  const getItemDesc = (item: ShopItem) => (t as any)[item.descKey] || item.descKey;

  const handleSelectItem = (item: ShopItem) => {
    setSelectedItem(item);
    setCurrentQuote(item.basePrice);
    setBidPrice(item.basePrice);
    setFeedback(`${getItemName(item)} | ${t.quote} ${item.basePrice} GP.`);
  };

  const handleConfirmBid = () => {
    if (!selectedItem) return;

    if (bidPrice > inventory.gold) {
      setFeedback(t.notEnoughGold);
      return;
    }

    const result: HaggleResult = MarketplaceEngine.evaluateBid(currentQuote, bidPrice, locale);

    if (result.outcome === 'ACCEPTED' && result.finalPrice) {
      setCompletedResult({
        type: 'ACCEPTED',
        item: selectedItem,
        pricePaid: result.finalPrice,
        message: result.message,
      });
    } else if (result.outcome === 'COUNTER' && result.counterPrice) {
      setCurrentQuote(result.counterPrice);
      setBidPrice(result.counterPrice);
      setFeedback(result.message);
    } else if (result.outcome === 'EJECTED') {
      setCompletedResult({
        type: 'EJECTED',
        item: selectedItem,
        message: result.message,
      });
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ backgroundColor: '#111', border: '2px solid #fbc02d', borderRadius: '8px', padding: '24px', maxWidth: '600px', width: '90%', color: '#fbc02d', fontFamily: 'monospace', position: 'relative' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #fbc02d', paddingBottom: '10px', marginBottom: '16px' }}>
          <h2 style={{ margin: 0 }}>{t.shopTitle}</h2>
          <div>{t.yourGold} <strong>{inventory.gold} GP</strong></div>
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
              <div style={{ fontWeight: 'bold', color: '#fff' }}>{getItemName(item)}</div>
              <div style={{ fontSize: '12px', color: '#888' }}>{t.quote} {item.basePrice} GP</div>
            </div>
          ))}
        </div>

        {/* Haggling Panel */}
        {selectedItem && (
          <div style={{ border: '1px dashed #fbc02d', padding: '16px', backgroundColor: '#050505', marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#fff' }}>{t.bargainFor} {getItemName(selectedItem)}</h4>
            <p style={{ fontSize: '12px', color: '#aaa', margin: '0 0 12px 0' }}>{getItemDesc(selectedItem)}</p>
            
            <div style={{ marginBottom: '12px' }}>
              <label>{t.yourBid} <strong>{bidPrice} GP</strong> ({t.quote} {currentQuote} GP)</label>
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
              {t.offerBtn} ({bidPrice} GP)
            </button>
          </div>
        )}

        <div style={{ color: '#fff', fontSize: '13px', marginBottom: '16px', minHeight: '32px', fontStyle: 'italic', borderLeft: '3px solid #fbc02d', paddingLeft: '8px' }}>
          {feedback}
        </div>

        <button
          onClick={onClose}
          style={{ backgroundColor: '#333', color: '#aaa', border: '1px solid #555', padding: '8px 16px', cursor: 'pointer', fontFamily: 'monospace', width: '100%' }}
        >
          {t.exitShopBtn}
        </button>

        {/* Pop-up Confirmation Result */}
        {completedResult && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            border: `2px solid ${completedResult.type === 'ACCEPTED' ? '#00ff00' : '#ff3333'}`,
            borderRadius: '8px', padding: '24px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', zIndex: 10,
          }}>
            <h2 style={{ margin: '0 0 16px 0', color: completedResult.type === 'ACCEPTED' ? '#00ff00' : '#ff3333', fontSize: '22px' }}>
              {completedResult.type === 'ACCEPTED' ? t.transSuccess : t.ejectedTitle}
            </h2>

            <p style={{ color: '#fff', fontSize: '15px', marginBottom: '20px', lineHeight: '1.5' }}>
              {completedResult.message}
            </p>

            {completedResult.type === 'ACCEPTED' && (
              <p style={{ color: '#888', fontSize: '14px', marginBottom: '24px' }}>
                {t.acquiredText} <strong style={{ color: '#00ff00' }}>{getItemName(completedResult.item)}</strong> {t.forText} <strong style={{ color: '#fbc02d' }}>{completedResult.pricePaid} GP</strong>.
              </p>
            )}

            {completedResult.type === 'EJECTED' && (
              <p style={{ color: '#ff3333', fontSize: '14px', marginBottom: '24px' }}>
                {t.penaltyText} <strong style={{ color: '#ff3333' }}>{t.penaltyDetail}</strong>.
              </p>
            )}

            <button
              onClick={() => {
                if (completedResult.type === 'ACCEPTED' && completedResult.pricePaid !== undefined) {
                  onPurchaseComplete(completedResult.item, completedResult.pricePaid);
                } else {
                  onEjected();
                }
              }}
              style={{
                backgroundColor: completedResult.type === 'ACCEPTED' ? '#00ff00' : '#ff3333',
                color: '#000', border: 'none', padding: '12px 28px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', fontFamily: 'monospace', borderRadius: '4px'
              }}
            >
              {completedResult.type === 'ACCEPTED' ? t.claimContinueBtn : t.leaveShopBtn}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};