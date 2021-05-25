module Button exposing (..)

import Html exposing (Html, button, text)
import Html.Attributes
import Html.Events as Event


default : msg -> String -> Html msg
default onClick label =
    button [ Event.onClick onClick ] [ text label ]
