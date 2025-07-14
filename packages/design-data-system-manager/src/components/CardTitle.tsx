import React from 'react';
import { HStack, Text } from "@chakra-ui/react"
import { Circle, Folders, SquareFunctionIcon, Timer, Tag, MoveVertical, MoveHorizontal, Palette, Ruler, Expand, Type, Minus, Plus, SquareRoundCorner, PencilRuler, SquareStack, Blend, Figma } from "lucide-react"

interface CardTitleProps {
    title: string;
    cardType?: 'algorithm' | 'figma' | 'token' | 'collection' | 'taxonomy' | 'dimension' | 'COLOR' | 'DIMENSION' | 'SPACING' | 'FONT_FAMILY' | 'FONT_WEIGHT' | 'FONT_SIZE' | 'LINE_HEIGHT' | 'LETTER_SPACING' | 'DURATION' | 'CUBIC_BEZIER' | 'BLUR' | 'SPREAD' | 'RADIUS' | 'Custom' | 'system-variable';
}

const CardTitle: React.FC<CardTitleProps> = ({ title, cardType = 'algorithm' }) => {
    let icon = null;
    const size = 20;
    
    switch (cardType) {
        case "algorithm":
            icon = <SquareFunctionIcon size={size}/>;
            break;
        case 'collection':
            icon = <Folders size={size}/>;
            break;
        case 'taxonomy':
            icon = <Tag size={size}/>;
            break;
        case 'figma':
            icon = <Figma size={size}/>;
            break;
        case 'dimension':
            icon = <SquareStack size={size}/>;
            break;
        case 'COLOR':
            icon = <Palette size={size} />; 
            break;
        case 'DIMENSION':
            icon = <Ruler size={size} />;
            break;
        case 'SPACING':
            icon = <Expand size={size} />;
            break;
        case 'FONT_FAMILY':
        case 'FONT_WEIGHT':
        case 'FONT_SIZE':
            icon = <Type size={size} />;
            break;
        case 'LINE_HEIGHT':
            icon = <MoveVertical size={size} />;
            break;
        case 'LETTER_SPACING':
            icon = <MoveHorizontal size={size} />;
            break;
        case 'DURATION':
            icon = <Timer size={size} />;
            break;
        case 'CUBIC_BEZIER':
            icon = <Circle size={size} />;
            break;
        case 'BLUR':
            icon = <Minus size={size} />;
            break;
        case 'SPREAD':
            icon = <Plus size={size} />;
            break;
        case 'RADIUS':
            icon = <SquareRoundCorner size={size} />;
            break;
        case 'system-variable':
            icon = <Blend size={size} />;
            break;
        default:
            icon = <PencilRuler size={size} />;
            break;
    }

    return (
        <HStack>
            {icon}
            <Text fontSize="lg" fontWeight="bold">{title}</Text>
        </HStack>
    )
}

export {CardTitle}