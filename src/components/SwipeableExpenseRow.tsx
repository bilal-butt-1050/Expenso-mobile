import React, { useRef, useEffect } from 'react';
import { Animated, View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Easing, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { CategoryPill } from './CategoryPill';
import { CustomSwitch } from './CustomSwitch';
import { formatCurrency } from '../utils/currency';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { Expense } from '../types/models';
import { hapticMedium, hapticHeavy, hapticLight } from '../utils/haptics';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface SwipeableExpenseRowProps {
  item: Expense;
  isNewlyAdded?: boolean;
  isDeleting?: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onToggleStatus: () => void;
  onDeleteAnimFinish?: () => void;
  onDelete: () => void;
}

export function SwipeableExpenseRow({
  item,
  isNewlyAdded,
  isDeleting,
  onPress,
  onLongPress,
  onToggleStatus,
  onDeleteAnimFinish,
  onDelete
}: SwipeableExpenseRowProps) {
  const [isPaid, setIsPaid] = React.useState(item.status === 'Paid');
  const highlightAnim = useRef(new Animated.Value(isNewlyAdded ? 1 : 0)).current;
  const deleteAnim = useRef(new Animated.Value(0)).current;
  const swipeableRef = useRef<any>(null);

  useEffect(() => {
    setIsPaid(item.status === 'Paid');
  }, [item.status]);

  useEffect(() => {
    if (isNewlyAdded) {
      Animated.sequence([
        Animated.timing(highlightAnim, { toValue: 1, duration: 0, useNativeDriver: false }),
        Animated.timing(highlightAnim, { toValue: 0, duration: 2000, delay: 500, useNativeDriver: false })
      ]).start();
    }
  }, [isNewlyAdded]);

  useEffect(() => {
    if (isDeleting) {
      Animated.sequence([
        Animated.timing(deleteAnim, {
          toValue: 1,
          duration: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      ]).start(() => {
        if (onDeleteAnimFinish) onDeleteAnimFinish();
      });
    }
  }, [isDeleting]);

  const handleToggle = () => {
    hapticLight();
    setIsPaid(!isPaid);
    onToggleStatus();
  };

  const renderRightActions = () => {
    return (
      <View style={styles.rightAction}>
        <MaterialCommunityIcons name="trash-can-outline" size={26} color="#FFFFFF" />
      </View>
    );
  };

  const renderLeftActions = () => {
    return (
      <View style={styles.leftAction}>
        <MaterialCommunityIcons name={isPaid ? 'close' : 'check'} size={26} color="#FFFFFF" />
      </View>
    );
  };

  const onSwipeableOpen = (direction: 'left' | 'right') => {
    if (direction === 'right') {
      hapticHeavy();
      swipeableRef.current?.close();
      onDelete();
    } else if (direction === 'left') {
      hapticMedium();
      swipeableRef.current?.close();
      handleToggle();
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View style={{
        transform: [{
          translateX: deleteAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -SCREEN_WIDTH]
          })
        }]
      }}>
        <Swipeable
          ref={swipeableRef}
          renderRightActions={renderRightActions}
          renderLeftActions={renderLeftActions}
          onSwipeableOpen={onSwipeableOpen}
          friction={2}
          rightThreshold={60}
          leftThreshold={60}
          containerStyle={{ borderRadius: 16 }}
        >
          <Animated.View style={[
            styles.row,
            {
              backgroundColor: highlightAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [colors.surfaceRaised, 'rgba(129, 140, 248, 0.2)']
              })
            }
          ]}>
            <TouchableOpacity
              style={styles.rowTouchArea}
              delayLongPress={150}
              onPress={onPress}
              onLongPress={onLongPress}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${item.category.name}, ${formatCurrency(item.amount)}, ${isPaid ? "Paid" : "Unpaid"}`}
            >
              <CategoryPill icon={item.category.icon} size={48} />
              <View style={styles.rowMiddle}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.category.name}
                </Text>
              </View>
            </TouchableOpacity>
            <View style={styles.rowEnd}>
              <Text style={styles.rowAmount}>{formatCurrency(item.amount)}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: isPaid ? colors.textPrimary : colors.textSecondary }}>
                  {isPaid ? "Paid" : "Unpaid"}
                </Text>
                <CustomSwitch
                  value={isPaid}
                  onValueChange={handleToggle}
                />
              </View>
            </View>
          </Animated.View>
        </Swipeable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  rightAction: {
    flex: 1,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 24,
    borderRadius: 16,
  },
  leftAction: {
    flex: 1,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 24,
    borderRadius: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceRaised,
  },
  rowTouchArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowMiddle: { flex: 1 },
  rowTitle: { ...typography.body, fontWeight: '600', fontSize: 18 },
  rowEnd: { alignItems: 'flex-end', gap: spacing.xs },
  rowAmount: { fontSize: 19, fontWeight: '700', color: colors.textPrimary },
});
