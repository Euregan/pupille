module Button exposing (default, positive)

import Html exposing (Html, button, text)
import Html.Attributes exposing (class)
import Html.Events as Event


base : String -> msg -> String -> Html msg
base classes onClick label =
    button [ class classes, Event.onClick onClick ] [ text label ]


default : msg -> String -> Html msg
default =
    base ""


positive : msg -> String -> Html msg
positive =
    base "green"
